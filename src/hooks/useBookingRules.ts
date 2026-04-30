// Hook centralizado de regras de agendamento
// Lê configurações do admin (business_settings + available_time_slots)
// e expõe utilidades unificadas para VilaNova, AgendaDireto e MemberArea.

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SlotRow {
  id: string;
  slot_time: string; // "HH:MM:SS"
  weekday: number | null;
  active: boolean;
  sort_order: number;
}

interface BookedSlot {
  appointment_date: string;
  appointment_time: string;
  barber_name: string | null;
}

export interface BookingDate {
  iso: string;        // YYYY-MM-DD
  day: string;        // 28
  weekday: string;    // ter
  month: string;      // mai
  weekdayNum: number; // 0..6
  isToday: boolean;
}

export interface BookingRulesAPI {
  loading: boolean;
  settings: Record<string, string>;
  dates: BookingDate[];
  getTimesFor: (dateIso: string, barberName?: string | null) => string[];
  isSlotBlocked: (dateIso: string, time: string, barberName?: string | null) => boolean;
  /** Status de confirmação que o INSERT deve usar */
  defaultStatus: "pending" | "confirmed";
}

const pad = (n: number) => String(n).padStart(2, "0");

const formatDate = (d: Date): BookingDate => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dn = new Date(d);
  dn.setHours(0, 0, 0, 0);
  return {
    iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    day: pad(d.getDate()),
    weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toLowerCase(),
    month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toLowerCase(),
    weekdayNum: d.getDay(),
    isToday: dn.getTime() === today.getTime(),
  };
};

export function useBookingRules(): BookingRulesAPI {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [manualSlots, setManualSlots] = useState<SlotRow[]>([]);
  const [booked, setBooked] = useState<BookedSlot[]>([]);

  // Fetch inicial
  useEffect(() => {
    (async () => {
      const [sRes, slotsRes, aptsRes] = await Promise.all([
        supabase.from("business_settings").select("key,value"),
        supabase.from("available_time_slots").select("*").eq("active", true).order("sort_order"),
        supabase
          .from("appointments")
          .select("appointment_date,appointment_time,barber_name")
          .in("status", ["pending", "confirmed"])
          .gte("appointment_date", new Date().toISOString().slice(0, 10)),
      ]);

      const map: Record<string, string> = {};
      for (const r of sRes.data || []) map[r.key] = r.value || "";
      setSettings(map);
      setManualSlots((slotsRes.data || []) as SlotRow[]);
      setBooked((aptsRes.data || []) as BookedSlot[]);
      setLoading(false);
    })();
  }, []);

  // Realtime: refresca booked ao surgir novo appointment
  useEffect(() => {
    const ch = supabase
      .channel("booking-rules-apts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        (payload) => {
          const row = payload.new as any;
          if (!row?.appointment_date) return;
          setBooked((prev) => {
            // remove dups e adiciona/atualiza
            const filtered = prev.filter(
              (b) =>
                !(
                  b.appointment_date === row.appointment_date &&
                  b.appointment_time === row.appointment_time &&
                  (b.barber_name || "") === (row.barber_name || "")
                )
            );
            if (["pending", "confirmed"].includes(row.status)) {
              filtered.push({
                appointment_date: row.appointment_date,
                appointment_time: row.appointment_time,
                barber_name: row.barber_name || null,
              });
            }
            return filtered;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Datas disponíveis
  const dates = useMemo<BookingDate[]>(() => {
    const out: BookingDate[] = [];
    const now = new Date();
    const daysOff = (settings.days_off || "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    const closedDays = (settings.closed_days || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const mode = (settings.week_window_mode || "rolling") as "rolling" | "current_week";
    const minAdvanceHours = parseInt(settings.min_advance_hours || "0", 10);
    const maxAdvanceDays = parseInt(settings.max_advance_days || "30", 10);

    let start: Date;
    let count: number;
    if (mode === "current_week") {
      // Semana atual (dom→sáb). Reseta toda segunda às 00:00 (próxima semana).
      const dow = now.getDay(); // 0=dom
      // Se quisermos seg→dom, ajustar:
      const offset = dow === 0 ? -6 : 1 - dow; // segunda atual
      start = new Date(now);
      start.setDate(now.getDate() + offset);
      start.setHours(0, 0, 0, 0);
      count = 7;
    } else {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      count = Math.min(maxAdvanceDays, 30);
    }

    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const isPast = d.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      if (isPast) continue;

      const wd = d.getDay();
      if (daysOff.includes(wd)) continue;

      const fmt = formatDate(d);
      if (closedDays.includes(fmt.iso)) continue;

      // Antecedência mínima — se for hoje, valida no getTimesFor
      // Antecedência máxima
      const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000);
      if (diffDays > maxAdvanceDays) continue;

      out.push(fmt);
    }

    // Para quem está em "rolling" mas pediu min_advance, ainda mostra hoje (slots cuidam)
    void minAdvanceHours;
    return out;
  }, [settings]);

  const generateIntervalTimes = useCallback((): string[] => {
    const opening = settings.opening_time || "09:00";
    const closing = settings.closing_time || "19:00";
    const lunchStart = settings.lunch_start || "12:00";
    const lunchEnd = settings.lunch_end || "13:00";
    const duration = parseInt(settings.default_duration || "30", 10);
    const interval = parseInt(settings.interval_between || "0", 10);
    const step = duration + interval;

    const [oh, om] = opening.split(":").map(Number);
    const [ch, cm] = closing.split(":").map(Number);
    const [lsh, lsm] = lunchStart.split(":").map(Number);
    const [leh, lem] = lunchEnd.split(":").map(Number);

    const times: string[] = [];
    let h = oh, m = om;
    while (h < ch || (h === ch && m < cm)) {
      const t = `${pad(h)}:${pad(m)}`;
      const inLunch =
        (h > lsh || (h === lsh && m >= lsm)) && (h < leh || (h === leh && m < lem));
      if (!inLunch) times.push(t);
      m += step;
      while (m >= 60) {
        m -= 60;
        h += 1;
      }
    }
    return times;
  }, [settings]);

  const getTimesFor = useCallback(
    (dateIso: string, _barberName?: string | null): string[] => {
      const mode = (settings.slot_generation_mode || "interval") as "interval" | "manual";
      const target = new Date(dateIso + "T00:00:00");
      const wd = target.getDay();

      let baseTimes: string[];
      if (mode === "manual" && manualSlots.length > 0) {
        baseTimes = manualSlots
          .filter((s) => s.weekday === null || s.weekday === wd)
          .map((s) => s.slot_time.slice(0, 5));
      } else {
        baseTimes = generateIntervalTimes();
      }

      // Antecedência mínima (se for hoje)
      const minAdvanceHours = parseInt(settings.min_advance_hours || "0", 10);
      const now = new Date();
      const isToday = target.toDateString() === now.toDateString();
      const minTime = new Date(now.getTime() + minAdvanceHours * 3600 * 1000);

      return baseTimes.filter((t) => {
        if (!isToday) return true;
        const [hh, mm] = t.split(":").map(Number);
        const slotDt = new Date(target);
        slotDt.setHours(hh, mm, 0, 0);
        return slotDt.getTime() >= minTime.getTime();
      });
    },
    [settings, manualSlots, generateIntervalTimes]
  );

  const isSlotBlocked = useCallback(
    (dateIso: string, time: string, barberName?: string | null): boolean => {
      const maxPerSlot = parseInt(settings.max_per_slot || "1", 10);
      const tNorm = time.length === 5 ? `${time}:00` : time;
      const same = booked.filter(
        (b) => b.appointment_date === dateIso && b.appointment_time?.slice(0, 5) === time
      );
      if (barberName) {
        // bloqueia somente se o barbeiro alvo já tem
        return same.some((b) => (b.barber_name || "").toLowerCase() === barberName.toLowerCase());
      }
      // sem barbeiro selecionado: bloqueia ao atingir capacidade total
      void tNorm;
      return same.length >= maxPerSlot;
    },
    [booked, settings]
  );

  const defaultStatus: "pending" | "confirmed" =
    (settings.confirmation_mode || "auto") === "manual" ? "pending" : "confirmed";

  return { loading, settings, dates, getTimesFor, isSlotBlocked, defaultStatus };
}
