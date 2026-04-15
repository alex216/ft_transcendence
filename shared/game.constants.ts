// frontと同じにするべきだった分 start。。。
export const SECOND = 1000;
export const FPS = 60;
export const FIELD_WIDTH = 800;
export const FIELD_HEIGHT = 600;
export const PAD_SPEED = 8;
export const PAD_WIDTH = 20;
export const PAD_LENGTH = 100;
export const PAD_BORDER_DIST = 40;
export const AI_SOCKET_ID = null;
export const AI_USER_ID = -1;
export const GRACE_TIME = SECOND * 10;
// 。。。finish

export const FIELD_CENTER = { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 };
export const PAD_HALF = PAD_LENGTH / 2;
export const LEFTPAD_LEFTMOST = 0 + PAD_BORDER_DIST;
export const LEFTPAD_RIGHTMOST = LEFTPAD_LEFTMOST + PAD_WIDTH;
export const RIGHTPAD_RIGHTMOST = FIELD_WIDTH - PAD_BORDER_DIST;
export const RIGHTPAD_LEFTMOST = RIGHTPAD_RIGHTMOST - PAD_WIDTH;
export const STARTING_POSITION = FIELD_HEIGHT / 2 - PAD_HALF;
export const UPPER_LIMIT = FIELD_HEIGHT - PAD_LENGTH;
export const SPEED_BASE = 5;
export const ANGLE_CHANGE = SPEED_BASE * 4;
export const SPEED_CHANGE = -1.1;
export const MAX_SCORE = 11;

// AI settings
export const PREDICTION_NOT_SET = -1;
export const RE_PREDICT_PROBABILITY = 0.05;
export const DIFFICULTY = 1; // (0 -> very strong) (2 -> very weak)
export const POSITIVE_ERROR = PAD_HALF + PAD_LENGTH * DIFFICULTY;
export const NEGATIVE_ERROR = -POSITIVE_ERROR;
export const MIN_REACTION_DELAY = SECOND / 10;
export const MAX_REACTION_DELAY = MIN_REACTION_DELAY + DIFFICULTY * SECOND;
