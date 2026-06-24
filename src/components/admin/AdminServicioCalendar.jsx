import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import AdminSidebar from "./AdminSidebar";
import "./admin.css";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { startDay, daysInMonth };
}

function toISO(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function AdminServicioCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [slots, setSlots] = useState({});
  const [loading, setLoading] = useState(true);
  const [defaultSlots, setDefaultSlots] = useState(5);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editMaxSlots, setEditMaxSlots] = useState(5);
  const [saving, setSaving] = useState(false);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const configSnap = await getDoc(doc(db, "servicioConfig", "default"));
      if (configSnap.exists()) {
        setDefaultSlots(configSnap.data().defaultSlotsPerDay || 5);
      }

      const startDate = toISO(year, month, 1);
      const endDate = toISO(year, month, new Date(year, month + 1, 0).getDate());

      const snap = await getDocs(collection(db, "servicioSlots"));
      const map = {};
      snap.forEach((d) => {
        const id = d.id;
        if (id >= startDate && id <= endDate) map[id] = d.data();
      });
      setSlots(map);
    } catch (err) {
      console.error("Error cargando slots:", err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const toggleDate = async (dateStr) => {
    setSaving(true);
    try {
      if (slots[dateStr]) {
        await deleteDoc(doc(db, "servicioSlots", dateStr));
        setSlots((prev) => {
          const next = { ...prev };
          delete next[dateStr];
          return next;
        });
        if (selectedDate === dateStr) setSelectedDate(null);
      } else {
        const newSlot = {
          date: dateStr,
          maxSlots: defaultSlots,
          slotsReserved: 0,
          enabled: true,
        };
        await setDoc(doc(db, "servicioSlots", dateStr), {
          ...newSlot,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setSlots((prev) => ({ ...prev, [dateStr]: newSlot }));
      }
    } catch (err) {
      console.error("Error toggling date:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateSlotMax = async () => {
    if (!selectedDate || !slots[selectedDate]) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "servicioSlots", selectedDate), {
        maxSlots: Number(editMaxSlots),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSlots((prev) => ({
        ...prev,
        [selectedDate]: { ...prev[selectedDate], maxSlots: Number(editMaxSlots) },
      }));
      setSelectedDate(null);
    } catch (err) {
      console.error("Error updating slot max:", err);
    } finally {
      setSaving(false);
    }
  };

  const { startDay, daysInMonth } = getMonthDays(year, month);
  const monthName = new Date(year, month).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const today = toISO(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="af-header">
          <h1 className="af-page-title" style={{ textAlign: "center" }}>Calendario de Turnos — Servicio Técnico</h1>
        </div>

        <p style={{ color: "#888", fontSize: 13, marginBottom: 16, textAlign: "center" }}>
          Hacé click en un día para habilitarlo/deshabilitarlo. Los días habilitados (verde) aparecen en el calendario del usuario.
        </p>

        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 }}>
          <button onClick={prevMonth} className="af-save-btn" style={{ padding: "8px 16px", fontSize: 14 }}>
            ← Anterior
          </button>
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, textTransform: "capitalize", margin: 0, minWidth: 200, textAlign: "center" }}>
            {monthName}
          </h2>
          <button onClick={nextMonth} className="af-save-btn" style={{ padding: "8px 16px", fontSize: 14 }}>
            Siguiente →
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: "center" }}>Cargando calendario...</p>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 6,
            maxWidth: 760,
            margin: "0 auto",
          }}>
            {/* Day headers */}
            {DAYS.map((d) => (
              <div key={d} style={{
                textAlign: "center",
                color: "#888",
                fontWeight: 700,
                fontSize: 13,
                padding: "8px 0",
              }}>
                {d}
              </div>
            ))}

            {/* Empty cells */}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = toISO(year, month, day);
              const slot = slots[dateStr];
              const isPast = dateStr < today;
              const isEnabled = !!slot;
              const isSelected = selectedDate === dateStr;

              return (
                <div
                  key={day}
                  onClick={() => {
                    if (isPast) return;
                    if (isEnabled && !isSelected) {
                      setSelectedDate(dateStr);
                      setEditMaxSlots(slot.maxSlots);
                    } else if (isSelected) {
                      setSelectedDate(null);
                    } else {
                      toggleDate(dateStr);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!isPast && isEnabled) toggleDate(dateStr);
                  }}
                  style={{
                    padding: "10px 4px",
                    borderRadius: 8,
                    textAlign: "center",
                    cursor: isPast ? "default" : "pointer",
                    opacity: isPast ? 0.3 : 1,
                    background: isSelected
                      ? "rgba(200, 244, 0, 0.25)"
                      : isEnabled
                        ? "rgba(200, 244, 0, 0.10)"
                        : "#1a1a1a",
                    border: isEnabled
                      ? "2px solid #c8f400"
                      : "2px solid #2a2a2a",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 56,
                  }}
                >
                  <div style={{ color: isEnabled ? "#c8f400" : "#666", fontWeight: 700, fontSize: 16 }}>
                    {day}
                  </div>
                  {isEnabled && (
                    <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>
                      {slot.slotsReserved}/{slot.maxSlots}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Edit slot panel */}
        {selectedDate && slots[selectedDate] && (
          <div style={{
            marginTop: 20,
            padding: 20,
            background: "#1a1a1a",
            borderRadius: 12,
            border: "1px solid #2a2a2a",
            maxWidth: 400,
          }}>
            <h3 style={{ color: "#fff", margin: "0 0 12px" }}>
              {selectedDate} — {slots[selectedDate].slotsReserved} reservados
            </h3>
            <div className="af-field">
              <label className="af-label">Cupos máximos</label>
              <input
                className="af-input"
                type="number"
                min="1"
                value={editMaxSlots}
                onChange={(e) => setEditMaxSlots(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                className="af-save-btn"
                onClick={updateSlotMax}
                disabled={saving}
              >
                Guardar cupos
              </button>
              <button
                onClick={() => toggleDate(selectedDate)}
                disabled={saving}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 18px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Deshabilitar día
              </button>
              <button
                onClick={() => setSelectedDate(null)}
                style={{
                  background: "transparent",
                  color: "#888",
                  border: "1px solid #333",
                  borderRadius: 8,
                  padding: "10px 18px",
                  cursor: "pointer",
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{ marginTop: 24, display: "flex", gap: 24, color: "#888", fontSize: 13, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: "2px solid #c8f400", background: "rgba(200,244,0,0.1)" }} />
            Habilitado
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: "2px solid #2a2a2a", background: "#1a1a1a" }} />
            Deshabilitado
          </div>
          <span>Click = habilitar/editar · Click derecho = deshabilitar</span>
        </div>
        </div>{/* end max-width wrapper */}
      </div>
    </div>
  );
}
