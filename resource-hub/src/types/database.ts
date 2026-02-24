export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          owner_id: string;
          category_id: string | null;
          title: string;
          description: string;
          file_url: string;
          cover_url: string | null;
          status: Database["public"]["Enums"]["resource_status"];
          review_reason: string | null;
          published_at: string | null;
          rejected_at: string | null;
          download_count: number;
          favorite_count: number;
          created_at: string;
          updated_at: string;
          search_vector: unknown | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          category_id?: string | null;
          title: string;
          description: string;
          file_url: string;
          cover_url?: string | null;
          status?: Database["public"]["Enums"]["resource_status"];
          review_reason?: string | null;
          published_at?: string | null;
          rejected_at?: string | null;
          download_count?: number;
          favorite_count?: number;
          created_at?: string;
          updated_at?: string;
          search_vector?: unknown | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          category_id?: string | null;
          title?: string;
          description?: string;
          file_url?: string;
          cover_url?: string | null;
          status?: Database["public"]["Enums"]["resource_status"];
          review_reason?: string | null;
          published_at?: string | null;
          rejected_at?: string | null;
          download_count?: number;
          favorite_count?: number;
          created_at?: string;
          updated_at?: string;
          search_vector?: unknown | null;
        };
        Relationships: [];
      };
      resource_tags: {
        Row: {
          resource_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          resource_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          resource_id?: string;
          tag_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          resource_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          resource_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
          user_id: string;
          resource_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          resource_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          resource_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      downloads: {
        Row: {
          id: string;
          user_id: string | null;
          resource_id: string;
          ip_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          resource_id: string;
          ip_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          resource_id?: string;
          ip_hash?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      resource_status: "pending" | "published" | "rejected";
    };
    CompositeTypes: Record<string, never>;
  };
};
