/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user?: {
      userId: number;
      email: string;
      role: 'owner' | 'editor';
      name: string;
    };
  }
}
