// frontと同じにするべきだった分 start。。。
export const FIELD_WIDTH = 800;
export const FIELD_HEIGHT = 600;
export const PAD_SPEED = 8;
export const PAD_WIDTH = 20;
export const PAD_LENGTH = 100;
export const PAD_BORDER_DIST = 40;
export const AI_SOCKET_ID = null;
export const AI_USER_ID = -1;
export const GRACE_TIME = 15000;
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
export const RE_PREDICT_PROBABILITY = 0.1;
export const DEFAULT_DIFFICULTY = 0.5;
export const MAX_DIFFICULTY = 0.25;
export const MIN_DIFFICULTY = 1.0;
export const BASE_REACTION_DELAY = 300;
