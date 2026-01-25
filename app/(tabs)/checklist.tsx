import { View, Text, StyleSheet } from 'react-native';

export default function ChecklistScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checklist</Text>
      <Text style={styles.subtitle}>Gérez vos tâches de voyage ici</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
