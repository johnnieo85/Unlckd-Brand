
export const DAILY_QUOTES = [
  { text: "Consistency is the playground of the dull. Mastery is the home of the consistent.", author: "UNLCKD" },
  { text: "Your potential is a limited resource. Every day you don't push, you lose a piece of it.", author: "UNLCKD" },
  { text: "Pain is temporary. Pride is forever. Performance is the only truth.", author: "UNLCKD" },
  { text: "The version of you that wins is the one that shows up when the version of you that feels good is missing.", author: "UNLCKD" },
  { text: "Focus is a muscle. Train it until it can hold a vision through any storm.", author: "UNLCKD" },
  { text: "Speed is irrelevant if you're going in the wrong direction. Calibrate daily.", author: "UNLCKD" },
  { text: "The bridge between goals and accomplishment is discipline.", author: "Jim Rohn" },
  { text: "Obsession is what the lazy call dedication.", author: "UNLCKD" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Your body can stand almost anything. It’s your mind that you have to convince.", author: "UNLCKD" },
  { text: "Don’t stop when you’re tired. Stop when you’re done.", author: "UNLCKD" },
  { text: "Discipline is doing what needs to be done, even if you don't want to do it.", author: "UNLCKD" },
  { text: "A workout is a celebration of what your body can do, not a punishment for what you ate.", author: "UNLCKD" },
  { text: "The only bad workout is the one that didn't happen.", author: "UNLCKD" }
];

export const getDailyQuote = () => {
  const date = new Date();
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
};
