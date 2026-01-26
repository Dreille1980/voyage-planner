import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  ChangePasswordSchema,
  UpdateProfileSchema,
} from "./schemas";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  changePassword,
  verifyPassword,
} from "../db/userHandlers";
import { generateTokenPair, verifyRefreshToken } from "./jwt";

/**
 * Register a new user
 */
export async function handleRegister(req: Request, res: Response): Promise<void> {
  try {
    const data = RegisterSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await findUserByEmail(data.email);
    if (existingUser) {
      res.status(409).json({ error: "Un utilisateur avec cet email existe déjà" });
      return;
    }

    // Create user
    const user = createUser(data.email, data.password, data.name);

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Données invalides", details: error.issues });
      return;
    }
    console.error("Register error:", error);
    res.status(500).json({ error: "Erreur lors de la création du compte" });
  }
}

/**
 * Login a user
 */
export async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    const data = LoginSchema.parse(req.body);

    // Find user
    const user = await findUserByEmail(data.email);
    if (!user) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }

    // Verify password
    const isValidPassword = verifyPassword(data.password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Données invalides", details: error.issues });
      return;
    }
    console.error("Login error:", error);
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
}

/**
 * Refresh access token
 */
export async function handleRefreshToken(req: Request, res: Response): Promise<void> {
  try {
    const data = RefreshTokenSchema.parse(req.body);

    // Verify refresh token
    const payload = verifyRefreshToken(data.refreshToken);

    // Verify user still exists
    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: "Utilisateur non trouvé" });
      return;
    }

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    res.json(tokens);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Données invalides", details: error.issues });
      return;
    }
    res.status(401).json({ error: "Token de rafraîchissement invalide" });
  }
}

/**
 * Get current user profile
 */
export async function handleGetProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const user = await findUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ error: "Utilisateur non trouvé" });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du profil" });
  }
}

/**
 * Update user profile
 */
export async function handleUpdateProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const data = UpdateProfileSchema.parse(req.body);

    // Check if email is being changed and already exists
    if (data.email) {
      const existingUser = await findUserByEmail(data.email);
      if (existingUser && existingUser.id !== req.user.userId) {
        res.status(409).json({ error: "Cet email est déjà utilisé" });
        return;
      }
    }

    const updatedUser = await updateUser(req.user.userId, data);
    if (!updatedUser) {
      res.status(404).json({ error: "Utilisateur non trouvé" });
      return;
    }

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Données invalides", details: error.issues });
      return;
    }
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du profil" });
  }
}

/**
 * Change password
 */
export async function handleChangePassword(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const data = ChangePasswordSchema.parse(req.body);

    // Get user with password
    const user = await findUserByEmail(req.user.email);
    if (!user) {
      res.status(404).json({ error: "Utilisateur non trouvé" });
      return;
    }

    // Verify current password
    const isValidPassword = verifyPassword(data.currentPassword, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: "Mot de passe actuel incorrect" });
      return;
    }

    // Change password
    await changePassword(req.user.userId, data.newPassword);

    res.json({ message: "Mot de passe modifié avec succès" });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Données invalides", details: error.issues });
      return;
    }
    console.error("Change password error:", error);
    res.status(500).json({ error: "Erreur lors du changement de mot de passe" });
  }
}
