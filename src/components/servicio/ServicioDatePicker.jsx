import React, { useState } from "react";
import "./ServicioDatePicker.css";

const DAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

function toISO(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function ServicioDatePicker({ availableSlots, selectedDate, onSelect }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const today = toISO(now.getFullYear(), now.getMonth(), now.getDate());

  // Build a map from date string to slot data
  const slotMap = {};
  (availableSlots || []).forEach((s) => {
    slotMap[s.date] = s;
  });

  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = new Date(year, month).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  return (
    <div className="sdp-container">
      {/* Month nav */}
      <div className="sdp-nav">
        <button className="sdp-nav-btn" onClick={prevMonth}>←</button>
        <h3 className="sdp-month">{monthName}</h3>
        <button className="sdp-nav-btn" onClick={nextMonth}>→</button>
      </div>

      {/* Day headers */}
      <div className="sdp-grid">
        {DAYS.map((d) => (
          <div key={d} className="sdp-day-header">{d}</div>
        ))}

        {/* Empty cells */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = toISO(year, month, day);
          const slot = slotMap[dateStr];
          const isPast = dateStr < today;
          const isFull = slot && (slot.slotsReserved || 0) >= (slot.maxSlots || 5);
          const isAvailable = slot && !isPast && !isFull;
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === today;

          const handleClick = () => {
            if (isAvailable) onSelect(dateStr);
          };

          return (
            <div
              key={day}
              onClick={handleClick}
              className={[
                "sdp-day",
                isAvailable ? "sdp-day--available" : "",
                isSelected ? "sdp-day--selected" : "",
                isPast || !slot ? "sdp-day--disabled" : "",
                isFull ? "sdp-day--full" : "",
                isToday ? "sdp-day--today" : "",
              ].filter(Boolean).join(" ")}
            >
              <span className="sdp-day-num">{day}</span>
              {slot && !isPast && (
                <span className="sdp-day-slots">
                  {isFull ? "lleno" : `${(slot.maxSlots || 5) - (slot.slotsReserved || 0)} lugar${((slot.maxSlots || 5) - (slot.slotsReserved || 0)) !== 1 ? "es" : ""}`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="sdp-legend">
        <div className="sdp-legend-item">
          <div className="sdp-legend-dot sdp-legend-dot--available" />
          Disponible
        </div>
        <div className="sdp-legend-item">
          <div className="sdp-legend-dot sdp-legend-dot--full" />
          Sin cupos
        </div>
        <div className="sdp-legend-item">
          <div className="sdp-legend-dot sdp-legend-dot--disabled" />
          No habilitado
        </div>
      </div>
    </div>
  );
}
