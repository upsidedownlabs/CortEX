'use client';
import React from 'react';
import { motion, useSpring, useTransform, MotionValue } from 'framer-motion';
import { Brain } from 'lucide-react';

// Wrap Lucide Brain icon for motion
const MotionBrain = motion(Brain);

interface BrainSplitVisualizerProps {
    leftMotion: MotionValue<number>;
    rightMotion: MotionValue<number>;
    size?: number;
}

const BrainSplitVisualizer: React.FC<BrainSplitVisualizerProps> = ({
    leftMotion,
    rightMotion,
    size = 50,
}) => {
    // smooth spring values
    const leftSpring = useSpring(leftMotion, { stiffness: 120, damping: 20 });
    const rightSpring = useSpring(rightMotion, { stiffness: 120, damping: 20 });

    // value → scale and stroke mappings
    const leftScale = useTransform(leftSpring, (v) => 1 + v * 0.4);
    const rightScale = useTransform(rightSpring, (v) => 1 + v * 0.4);
    const leftStroke = useTransform(leftSpring, (v) => 1.5 + v * 2.5);
    const rightStroke = useTransform(rightSpring, (v) => 1.5 + v * 2.5);

    return (
        <div className="relative" style={{ width: size, height: size }}>
            {/* Left half */}
            <motion.div
                className="absolute top-0 left-0 overflow-hidden"
                style={{
                    width: size / 2,
                    height: size,
                    scale: leftScale,
                    transformOrigin: '0% 50%',
                }}
            >
                <MotionBrain
                    size={size}
                    className="text-[#C29963]"
                    style={{ strokeWidth: leftStroke }}
                />
            </motion.div>

            {/* Right half (mirrored) */}
            <motion.div
                className="absolute top-0 right-0 overflow-hidden"
                style={{
                    width: size / 2,
                    height: size,
                    scale: rightScale,
                    scaleX: -1,
                    transformOrigin: '100% 50%',
                }}
            >
                <MotionBrain
                    size={size}
                    className="text-[#63A2C2]"
                    style={{ strokeWidth: rightStroke }}
                />
            </motion.div>
        </div>
    );
};

export default BrainSplitVisualizer;
