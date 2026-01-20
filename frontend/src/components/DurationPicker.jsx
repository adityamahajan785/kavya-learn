import React, { useEffect, useState } from 'react';

/**
 * DurationPicker
 * modes:
 * - 'hm' -> hours + minutes inputs, onChange returns total minutes (number)
 * - 'units' -> unit dropdown (weeks/months/days/hours) on left and numeric input on right, onChange returns string like '4 weeks'
 */
export default function DurationPicker({ mode = 'units', value, onChange, selectPosition = 'left', showIcon = true }) {
  const [num, setNum] = useState('');
  const [unit, setUnit] = useState('weeks');
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');

  useEffect(() => {
    if (mode === 'hm') {
      if (value === undefined || value === null || value === '') {
        setHours('');
        setMins('');
        return;
      }
      if (typeof value === 'number') {
        const h = Math.floor(value / 60);
        const m = value % 60;
        setHours(h ? String(h) : '');
        setMins(m ? String(m) : '');
        return;
      }
      const s = String(value).trim();
      const colon = s.match(/^(\d+):(\d{1,2})$/);
      if (colon) {
        setHours(colon[1]);
        setMins(colon[2]);
        return;
      }
      const hMatch = s.match(/(\d+)\s*h/i);
      const mMatch = s.match(/(\d+)\s*m/i);
      if (hMatch || mMatch) {
        setHours(hMatch ? hMatch[1] : '');
        setMins(mMatch ? mMatch[1] : '');
        return;
      }
      const onlyNum = s.match(/^(\d+)$/);
      if (onlyNum) {
        const total = Number(onlyNum[1]);
        setHours(String(Math.floor(total / 60)) || '');
        setMins(String(total % 60) || '');
        return;
      }
      setHours('');
      setMins('');
    } else {
      if (!value) {
        setNum('');
        setUnit('weeks');
        return;
      }
      const m = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*(\w+)?$/);
      if (m) {
        setNum(m[1]);
        setUnit(m[2] || 'weeks');
      } else {
        setNum(String(value));
        setUnit('weeks');
      }
    }
  }, [mode, value]);

  const handleUnitsChange = (n, u) => {
    setNum(n);
    setUnit(u);
    if (n === '' || isNaN(Number(n))) {
      onChange && onChange('');
      return;
    }
    onChange && onChange(`${n} ${u}`);
  };

  const handleHMChange = (hVal, mVal) => {
    const h = String(hVal).replace(/[^0-9]/g, '');
    const m = String(mVal).replace(/[^0-9]/g, '');
    setHours(h);
    setMins(m);
    const hNum = h === '' ? 0 : Number(h);
    const mNum = m === '' ? 0 : Number(m);
    const total = hNum * 60 + mNum;
    onChange && onChange(total);
  };

  if (mode === 'hm') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="number"
          min="0"
          step="1"
          placeholder="Hours"
          value={hours}
          onChange={(e) => handleHMChange(e.target.value, mins)}
          className="form-control"
          style={{ width: 100 }}
        />
        <span style={{ color: '#666' }}>h</span>
        <input
          type="number"
          min="0"
          max="59"
          step="1"
          placeholder="Minutes"
          value={mins}
          onChange={(e) => handleHMChange(hours, e.target.value)}
          className="form-control"
          style={{ width: 100 }}
        />
        <span style={{ color: '#666' }}>m</span>
      </div>
    );
  }

  // units mode: render select either left or right based on selectPosition
  const selectElement = (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        aria-label="Duration unit"
        value={unit}
        onChange={(e) => handleUnitsChange(num, e.target.value)}
        className="form-control"
        style={{ width: 120, WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', paddingRight: showIcon ? 28 : undefined }}
      >
        <option value="weeks">weeks</option>
        <option value="months">months</option>
        <option value="days">days</option>
        <option value="hours">hours</option>
      </select>
      {showIcon && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: 12, height: 12, color: '#666' }}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </div>
  );

  const inputElement = (
    <input
      type="number"
      min="0"
      step="1"
      placeholder="Duration"
      value={num}
      onChange={(e) => handleUnitsChange(e.target.value, unit)}
      className="form-control"
      style={{ width: 120 }}
    />
  );

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {selectPosition === 'left' ? (
        <>
          {selectElement}
          {inputElement}
        </>
      ) : (
        <>
          {inputElement}
          {selectElement}
        </>
      )}
    </div>
  );
}
