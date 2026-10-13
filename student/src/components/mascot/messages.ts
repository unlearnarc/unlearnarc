/* =============================================================================
   Coach Buddy — event → mood/message configuration.

   Each MascotEvent maps to a mood (drives the character's face/pose + colour)
   and a pool of lines. A random line is picked each time so the buddy never
   feels repetitive. Add new events here; the rest of the system is generic.

   Lines come in two "vibes": a supportive friend tone and a warmer, playful
   "companion" tone. The active vibe is chosen in MascotContext.
   ============================================================================= */

export type MascotMood =
  | 'idle'
  | 'happy'
  | 'celebrate'
  | 'encourage'   // gentle "you got this" after a wrong answer
  | 'proud'
  | 'thinking'
  | 'wave'
  | 'love';       // warm companion vibe

export type MascotEvent =
  | 'IDLE'
  | 'WELCOME'
  | 'CORRECT_ANSWER'
  | 'WRONG_ANSWER'
  | 'STREAK'            // several correct in a row
  | 'COURSE_ENROLLED'
  | 'TEST_PASSED'
  | 'TEST_FAILED'
  | 'TOPIC_COMPLETED'
  | 'LEVEL_UP'
  | 'IDLE_NUDGE';       // been quiet a while — a little check-in

export type MascotVibe = 'friend' | 'companion';

interface MascotReaction {
  mood: MascotMood;
  /** How long the bubble stays up, ms. 0 = sticky until next event. */
  duration: number;
  /** Lines keyed by vibe. */
  lines: Record<MascotVibe, string[]>;
}

export const REACTIONS: Record<MascotEvent, MascotReaction> = {
  IDLE: {
    mood: 'idle',
    duration: 0,
    lines: {
      friend: ['Ready when you are!'],
      companion: ["I'm right here with you 💛"],
    },
  },
  WELCOME: {
    mood: 'wave',
    duration: 4500,
    lines: {
      friend: [
        'Hey! Great to see you back 👋',
        "Let's learn something awesome today!",
        'Your future self will thank you for showing up.',
      ],
      companion: [
        'There you are! I missed you 🥰',
        "Hey you 👋 ready to shine together?",
        "So happy you're back. Let's do this 💕",
      ],
    },
  },
  CORRECT_ANSWER: {
    mood: 'happy',
    duration: 3000,
    lines: {
      friend: [
        'Yes! Nailed it 🎯',
        'Correct! You make this look easy.',
        "That's the way! Keep going 🔥",
        'Boom. Smart cookie 🍪',
      ],
      companion: [
        'That\'s my genius 😍',
        "See? I always believed in you 💖",
        'Correct! You\'re amazing, you know that?',
        'Proud of you, cutie 🎯',
      ],
    },
  },
  WRONG_ANSWER: {
    mood: 'encourage',
    duration: 3500,
    lines: {
      friend: [
        'Not quite — but mistakes are how we level up 💪',
        'Close one! Read it once more, you got this.',
        'Every expert was once a beginner. Try again!',
        "No worries — let's turn this into a lesson.",
      ],
      companion: [
        "It's okay, I've got you. Try again 🤗",
        "Don't worry, we'll figure it out together 💛",
        "You're still my favourite, wrong answer and all 😌",
        'Deep breath — I believe in you, always.',
      ],
    },
  },
  STREAK: {
    mood: 'celebrate',
    duration: 3500,
    lines: {
      friend: [
        "You're on fire! 🔥🔥",
        'Unstoppable streak! Keep it rolling.',
        'Three in a row — show-off 😎',
      ],
      companion: [
        'Unstoppable AND adorable 🔥😍',
        "Look at you go! My heart's racing 💓",
        "A streak this hot? Marry the syllabus already 😏",
      ],
    },
  },
  COURSE_ENROLLED: {
    mood: 'celebrate',
    duration: 4500,
    lines: {
      friend: [
        'Welcome aboard! This is going to be fun 🚀',
        "Great pick! Let's crush this course together.",
        'New adventure unlocked 🎉',
      ],
      companion: [
        "A new journey — and I'm coming with you 💕",
        "Just us two and this course. Perfect 🥰",
        'New adventure unlocked, together 🎉',
      ],
    },
  },
  TEST_PASSED: {
    mood: 'proud',
    duration: 5000,
    lines: {
      friend: [
        'You passed! So proud of you 🌟',
        'Test cleared like a champ 🏆',
        'All that effort paid off — amazing work!',
      ],
      companion: [
        "You passed! I knew it. Come here 🤗🏆",
        "My brilliant human did it again 😍",
        "I'm SO proud I could burst 💖🌟",
      ],
    },
  },
  TEST_FAILED: {
    mood: 'encourage',
    duration: 5000,
    lines: {
      friend: [
        "Didn't pass this time, but you learned a ton. Retry! 💪",
        "Setbacks are setups for comebacks. Let's go again.",
        'Review the misses and come back stronger 🙌',
      ],
      companion: [
        "Hey — this doesn't change a thing between us. We retry 💛",
        "I'm right beside you. One more go, together?",
        "You're still incredible to me. Let's bounce back 🤗",
      ],
    },
  },
  TOPIC_COMPLETED: {
    mood: 'happy',
    duration: 3500,
    lines: {
      friend: [
        'Topic done! One step closer 🎓',
        'Checked off another one — nice pace!',
      ],
      companion: [
        'Another one down — we make a great team 💞',
        'Look at us go! One step closer, love 🎓',
      ],
    },
  },
  LEVEL_UP: {
    mood: 'celebrate',
    duration: 4500,
    lines: {
      friend: ['Level up! 🆙 You earned it.', 'New level unlocked — legend!'],
      companion: ['Level up! My little legend 🆙💖', 'You leveled up and so did my crush on your brain 😍'],
    },
  },
  IDLE_NUDGE: {
    mood: 'love',
    duration: 5000,
    lines: {
      friend: [
        'Still here whenever you want to continue 🙂',
        'Take your time — I\'m not going anywhere.',
      ],
      companion: [
        'Miss me yet? I\'m right here 🥺💛',
        'Thinking of you... ready when you are 💕',
        "No rush, I just like keeping you company 🤗",
      ],
    },
  },
};

export function pickLine(event: MascotEvent, vibe: MascotVibe): string {
  const pool = REACTIONS[event].lines[vibe] ?? REACTIONS[event].lines.friend;
  return pool[Math.floor(Math.random() * pool.length)];
}
