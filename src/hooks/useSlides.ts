import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSlides() {
  return useQuery({
    queryKey: ["slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("slides")
        .select("*")
        .order("slide_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
