import { domMax } from "motion/react";

/**
 * Animation, gesture, drag and layout features for the `m` components. Loaded on demand by
 * MotionProvider, after the first paint, so they stay out of the critical JavaScript.
 */
export default domMax;
