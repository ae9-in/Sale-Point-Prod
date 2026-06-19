export const BREAK_SLOTS = [
  {
    id: "morning",
    label: "Morning Break",
    scheduledTime: "11:15 AM – 11:30 AM",
    startHour: 11,
    startMinute: 15,
    durationMinutes: 15,
    color: "amber",
    icon: "sunrise"
  },
  {
    id: "afternoon",
    label: "Afternoon Break",
    scheduledTime: "1:30 PM",
    startHour: 13,
    startMinute: 30,
    durationMinutes: 45,
    color: "blue",
    icon: "sun"
  },
  {
    id: "evening",
    label: "Evening Break",
    scheduledTime: "4:45 PM – 5:00 PM",
    startHour: 16,
    startMinute: 45,
    durationMinutes: 15,
    color: "purple",
    icon: "moon"
  }
];

export const EMERGENCY_BREAK = {
  id: "emergency",
  label: "Emergency Break",
  requiresApproval: true,
  color: "red"
};
