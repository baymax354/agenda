import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Service = Tables<"services">;
export type Professional = Tables<"professionals">;
export type Settings = Tables<"business_settings">;
export type Appointment = Tables<"appointments">;
export type AppointmentStatus = Appointment["status"];

export const CATEGORIES = ["Cabelo", "Barba", "Unhas", "Estética"] as const;

export const servicesQuery = queryOptions({
  queryKey: ["services"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return data;
  },
});

export const professionalsQuery = queryOptions({
  queryKey: ["professionals"],
  queryFn: async () => {
    const { data, error } = await supabase.from("professionals").select("*").order("created_at");
    if (error) throw error;
    return data;
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("business_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data;
  },
});

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/** Built-in photos the company can pick for services and professionals. */
export const PHOTO_GALLERY = [
  "/__l5e/assets-v1/fc5cf5c9-08d2-4384-ab45-e645e98474a5/service_corte_escova.webp",
  "/__l5e/assets-v1/7724b6a4-5b28-4e25-aa4f-dd048d7232cc/service_barba.webp",
  "/__l5e/assets-v1/015ff845-91a0-47a4-adc1-8982ff4ce834/service_manicure.webp",
  "/__l5e/assets-v1/509f0640-1a96-4199-97bd-a2fdbf40611d/service_hidratacao.webp",
  "/__l5e/assets-v1/a4659e25-fd64-4110-8429-449a840f5b9c/service_corte_masculino.webp",
  "/__l5e/assets-v1/2e3f3642-0584-41a1-9151-fafdab9e4acb/service_limpeza_pele.webp",
  "/__l5e/assets-v1/7c12006f-6e90-4a7c-9345-1627af97dd02/ana_silva.webp",
  "/__l5e/assets-v1/ca492b75-8a48-48cb-b51b-b9647220c55a/carlos_lima.webp",
  "/__l5e/assets-v1/1e2f0791-e3ba-4e18-bd35-f84bacfc5cba/juliana_costa.webp",
  "/__l5e/assets-v1/94d56e58-21f2-4b4f-9bc2-63ec3b608f0d/rafael_souza.webp",
];
