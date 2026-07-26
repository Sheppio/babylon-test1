export const ARENA_RADIUS = 34;
export const WALL_HEIGHT = 8;
export const PLAYER_EYE_HEIGHT = 1.7;
export const PLAYER_RADIUS = 0.6;
export const PLAYER_BASE_SPEED = 9.5;
export const PLAYER_SPRINT_MULT = 1.55;
export const PLAYER_MAX_HEALTH = 100;
export const GRAVITY = 22;
export const JUMP_SPEED = 8.2;

export const FIRE_COOLDOWN = 0.13;
export const WEAPON_DAMAGE = 26;
export const WEAPON_RANGE = 120;

export const TOUCH_LOOK_TURN_SPEED = 3.0;
export const TOUCH_PITCH_LIMIT = 1.3;
export const JOYSTICK_SPRINT_THRESHOLD = 0.85;
export const JOYSTICK_DEADZONE = 0.08;

export const ENEMY_BASE_HEALTH = 40;
export const ENEMY_BASE_SPEED = 3.4;
export const ENEMY_RADIUS = 0.65;
export const ENEMY_ATTACK_RANGE = 1.6;
export const ENEMY_ATTACK_DAMAGE = 9;
export const ENEMY_ATTACK_COOLDOWN = 0.9;
export const ENEMY_SEPARATION_RADIUS = 1.4;

export const PICKUP_RADIUS = 1.1;
export const PICKUP_HEAL_AMOUNT = 30;
export const PICKUP_LIFETIME = 20;

export interface Obstacle {
  x: number;
  z: number;
  radius: number;
}
