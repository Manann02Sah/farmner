import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export function useChatSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chat-sessions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("chat_sessions")
          .select("*")
          .eq("user_id", user!.id)
          .order("updated_at", { ascending: false });
        if (error) throw error;
        return data;
      } catch (error) {
        console.warn("Chat sessions could not be loaded.", error);
        return [];
      }
    },
  });
}

export function useChatMessages(sessionId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chat-messages", sessionId],
    enabled: !!user && !!sessionId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("session_id", sessionId!)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return data;
      } catch (error) {
        console.warn("Chat messages could not be loaded.", error);
        return [];
      }
    },
  });
}

export function useCreateSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      if (!user) throw new Error("Must be logged in");
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      content,
      role,
      sources,
    }: {
      sessionId: string;
      content: string;
      role: "user" | "assistant";
      sources?: object;
    }) => {
      if (!user) throw new Error("Must be logged in");
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          session_id: sessionId,
          user_id: user.id,
          content,
          role,
          sources: sources as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", vars.sessionId] });
    },
  });
}
