import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCurrentTrip } from '../../contexts/TripContext';
import { getChatMessages, sendChatMessage } from '../../services/api';
import type { ChatMessage } from '../../types/api';
import { colors, typography, spacing, borderRadius, shadows, componentStyles } from '../../theme';

const SUGGESTED_QUESTIONS = [
  'Quelle est la meilleure période pour visiter ?',
  'Quels documents sont nécessaires ?',
  'Quel budget prévoir pour la nourriture ?',
  'Quels sont les endroits incontournables ?',
  'Comment se déplacer sur place ?',
  'Quelles sont les précautions sanitaires ?',
];

export default function AssistantScreen() {
  const { currentTrip } = useCurrentTrip();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (currentTrip) {
      loadChatHistory();
    }
  }, [currentTrip]);

  const loadChatHistory = async () => {
    if (!currentTrip) return;

    try {
      setIsFetchingHistory(true);
      const history = await getChatMessages(currentTrip.id);
      setMessages(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentTrip || !inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsLoading(true);

    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      tripId: currentTrip.id,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await sendChatMessage(currentTrip.id, userMessage);

      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id);
        return [
          ...filtered,
          {
            id: `user-${Date.now()}`,
            tripId: currentTrip.id,
            role: 'user',
            content: response.userMessage.content,
            createdAt: new Date().toISOString(),
          },
          {
            id: response.assistantMessage.id,
            tripId: currentTrip.id,
            role: 'assistant',
            content: response.assistantMessage.content,
            createdAt: response.assistantMessage.createdAt,
          },
        ];
      });

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id));

      if (error.message.includes('429')) {
        Alert.alert(
          'Limite atteinte',
          'Vous avez atteint la limite de 5 questions par jour pour ce voyage. Réessayez demain !',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Erreur',
          `Impossible d'envoyer le message: ${error.message || 'Erreur inconnue'}`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputText(question);
  };

  if (!currentTrip) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Ionicons name="briefcase-outline" size={56} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>Aucun voyage sélectionné</Text>
        <Text style={styles.emptySubtitle}>
          Sélectionnez un voyage pour commencer à poser des questions à votre assistant.
        </Text>
        <TouchableOpacity
          style={styles.goToTripsButton}
          onPress={() => router.navigate('/(tabs)/trips')}
        >
          <Text style={styles.goToTripsText}>Aller aux voyages</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View>
          <Text style={styles.headerTitle}>Assistant IA</Text>
          <View style={styles.headerRow}>
            <View style={styles.tripBadge}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={styles.tripBadgeText}>{currentTrip.destination}</Text>
            </View>
            <View style={styles.limitBadge}>
              <Ionicons name="chatbubbles-outline" size={12} color={colors.textTertiary} />
              <Text style={styles.limitText}>5/jour max</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {isFetchingHistory ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {messages.length === 0 && (
              <View style={styles.welcomeContainer}>
                <View style={styles.welcomeIconContainer}>
                  <Ionicons name="sparkles" size={32} color={colors.primary} />
                </View>
                <Text style={styles.welcomeTitle}>Bonjour ! 👋</Text>
                <Text style={styles.welcomeText}>
                  Je suis votre assistant de voyage pour {currentTrip.destination}. Posez-moi vos questions !
                </Text>

                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>💡 Questions suggérées</Text>
                  {SUGGESTED_QUESTIONS.map((question, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionButton}
                      onPress={() => handleSuggestedQuestion(question)}
                      disabled={isLoading}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestionText}>{question}</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                {message.role === 'assistant' && (
                  <View style={styles.assistantAvatar}>
                    <Ionicons name="sparkles" size={12} color={colors.primary} />
                  </View>
                )}
                <View style={[
                  styles.bubbleContent,
                  message.role === 'user' ? styles.userBubbleContent : styles.assistantBubbleContent,
                ]}>
                  <Text
                    style={[
                      styles.messageText,
                      message.role === 'user' ? styles.userText : styles.assistantText,
                    ]}
                  >
                    {message.content}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      message.role === 'user' ? styles.userTime : styles.assistantTime,
                    ]}
                  >
                    {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            ))}

            {isLoading && (
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <View style={styles.assistantAvatar}>
                  <Ionicons name="sparkles" size={12} color={colors.primary} />
                </View>
                <View style={[styles.bubbleContent, styles.assistantBubbleContent, styles.typingBubble]}>
                  <ActivityIndicator size="small" color={colors.textTertiary} />
                  <Text style={styles.typingText}>Réflexion en cours...</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Posez votre question..."
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={500}
          editable={!isLoading}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons
            name="send"
            size={18}
            color={!inputText.trim() || isLoading ? colors.textTertiary : colors.textInverse}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxxl,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    ...componentStyles.screenHeader,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tripBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    gap: spacing.xs,
  },
  tripBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
  },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    gap: spacing.xs,
  },
  limitText: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // Empty
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  goToTripsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  goToTripsText: {
    ...typography.labelMedium,
    color: colors.textInverse,
  },

  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxxl,
  },

  // Welcome
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  welcomeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  welcomeText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  suggestionsContainer: {
    width: '100%',
    marginTop: spacing.sm,
  },
  suggestionsTitle: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  suggestionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  suggestionText: {
    ...typography.bodySmall,
    color: colors.primary,
    flex: 1,
  },

  // Message bubbles
  messageBubble: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  assistantBubble: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  bubbleContent: {
    maxWidth: '78%',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
  },
  userBubbleContent: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing.xs,
  },
  assistantBubbleContent: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  messageText: {
    ...typography.bodyMedium,
  },
  userText: {
    color: colors.textInverse,
  },
  assistantText: {
    color: colors.textPrimary,
  },
  messageTime: {
    ...typography.caption,
    marginTop: spacing.xs,
    fontSize: 11,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'right',
  },
  assistantTime: {
    color: colors.textTertiary,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typingText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
    maxHeight: 100,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceSecondary,
  },
});
