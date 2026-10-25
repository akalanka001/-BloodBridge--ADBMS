export function campDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Schedule unavailable';
  return new Date(value).toLocaleString('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Colombo',
  });
}

export function campDateParts(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) {
    return { month: 'CAMP', day: '--', full: 'Schedule unavailable', time: '' };
  }
  const date = new Date(value);
  const month = date.toLocaleString('en-LK', { month: 'short', timeZone: 'Asia/Colombo' }).toUpperCase();
  const day = date.toLocaleString('en-LK', { day: '2-digit', timeZone: 'Asia/Colombo' });
  const time = date.toLocaleString('en-LK', { timeStyle: 'short', timeZone: 'Asia/Colombo' });
  const weekday = date.toLocaleString('en-LK', { weekday: 'short', timeZone: 'Asia/Colombo' });
  const year = date.toLocaleString('en-LK', { year: 'numeric', timeZone: 'Asia/Colombo' });
  const full = `${weekday}, ${day} ${month} ${year} · ${time}`;
  return { month, day, time, weekday, year, full };
}

export function campCapacity(camp) {
  if (!camp) return 'Capacity unavailable';
  const cap = camp.capacity != null ? Number(camp.capacity) : null;
  const reg = camp.registered_count != null
    ? Number(camp.registered_count)
    : (camp.registered_donors != null ? Number(camp.registered_donors) : null);

  if (cap == null) {
    return reg != null ? `${reg} registered (No fixed capacity)` : 'No fixed capacity';
  }
  if (reg == null) {
    return `${cap} places · registration count unavailable`;
  }
  const remaining = Math.max(0, cap - reg);
  return `${reg} of ${cap} places registered (${remaining} remaining)`;
}

export function campArea(rank, savedArea = null, camp = null) {
  // If donor has no verified saved area and rank is undefined/null, no badge
  if (rank == null && !savedArea) return '';

  // Strict check when both savedArea and camp are available
  if (savedArea && camp) {
    if (
      savedArea.gn_code &&
      camp.gn_code &&
      savedArea.district_code === camp.district_code &&
      savedArea.ds_code === camp.ds_code &&
      savedArea.gn_code === camp.gn_code
    ) {
      return 'In your GN division';
    }
    if (
      savedArea.ds_code &&
      camp.ds_code &&
      savedArea.district_code === camp.district_code &&
      savedArea.ds_code === camp.ds_code
    ) {
      return 'In your DS division';
    }
    if (savedArea.district_code && camp.district_code && savedArea.district_code === camp.district_code) {
      return 'In your district';
    }
    if (savedArea.province_code && camp.province_code && savedArea.province_code === camp.province_code) {
      return 'In your province';
    }
    return '';
  }

  // Fallback to computed nearby_rank from database
  if (rank === 0) return 'In your GN division';
  if (rank === 1) {
    // Show "In your DS division" only when the camp and donor locations actually match
    if (savedArea?.ds_code && camp?.ds_code && savedArea.ds_code !== camp.ds_code) {
      return '';
    }
    return 'In your DS division';
  }
  if (rank === 2) return 'In your district';
  if (rank === 3) return 'In your province';
  return '';
}
