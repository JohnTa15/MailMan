import api from '../lib/api';
import { CalendarEvent, CalendarInfo, CalendarProblem } from '../types';

export const calendarService = {
  async calendars() {
    return (await api.get<{ calendars: CalendarInfo[]; problems: CalendarProblem[] }>('/calendars', { timeout: 60000 })).data;
  },
  async events(from: Date, to: Date) {
    const response = await api.get<{ events: CalendarEvent[]; problems: CalendarProblem[] }>('/calendars/events', {
      params: { from: from.toISOString(), to: to.toISOString() },
      timeout: 60000,
    });
    return response.data;
  },
};
