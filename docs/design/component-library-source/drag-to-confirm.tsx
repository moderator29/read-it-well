: import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronRight, Check, Trash2, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motionTransitions } from '../../lib/motion-tokens';

export type DragConfirmActionType =
  | 'delete'
  | 'archive'
  | 'confirm'
  | 'submit'
  | 'unlock'
  | 'continue';

export interface DragToConfirmProps {
  /** Label shown along track */
  label?: string;
  /** Label shown upon completion */
  confirmedLabel?: string;
  /** Action archetype */
  actionType?: DragConfirmActionType;
  /** Callback fired on confirmation reach */
  onConfirm?: () => void;
  /** Callback fired when reset back to start */
  onReset?: () => void;
  /** Reset to start automatically after completion delay (ms) */
  autoResetDelay?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Custom track class name */
  className?: string;
}

export const DragToConfirm: React.FC<DragToConfirmProps> = ({
  label = 'Slide to confirm',
  confirmedLabel = 'Confirmed ✓',
  actionType = 'confirm',
  onConfirm,
  onReset,
  autoResetDelay = 2500,
  disabled = false,
  className,
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragMax, setDragMax] = useState(200);

  const x = useMotionValue(0);

  const calculateMaxDrag = useCallback(() => {
    if (trackRef.current) {
      const trackWidth = trackRef.current.offsetWidth;
      // Handle button width is 44px, padding 4px * 2 = 8px
      setDragMax(Math.max(50, trackWidth - 52));
    }
  }, []);

  useEffect(() => {
    calculateMaxDrag();
    window.addEventListener('resize', calculateMaxDrag);
    return () => window.removeEventListener('resize', calculateMaxDrag);
  }, [calculateMaxDrag]);

  // Opacity of track text decreases as user drags handle across
  const textOpacity = useTransform(x, [0, dragMax * 0.7], [1, 0.05]);
  const trackBgOpacity = useTransform(x, [0, dragMax], [0, 1]);

  const handleDragEnd = () => {
    const currentX = x.get();
    if (currentX >= dragMax * 0.88 && !isConfirmed) {
      // Snapped to end successfully
      animate(x, dragMax, motionTransitions.springSnappy);
      setIsConfirmed(true);
      onConfirm?.();

      if (autoResetDelay > 0) {
        setTimeout(() => {
          setIsConfirmed(false);
          animate(x, 0, motionTransitions.springResponsive);
          onReset?.();
        }, autoResetDelay);
      }
    } else {
      // Snap back to 0
      animate(x, 0, motionTransitions.springResponsive);
    }
  };

  const handleKeyboardConfirm = () => {
    if (disabled || isConfirmed) return;
    animate(x, dragMax, motionTransitions.springSnappy);
    setIsConfirmed(true);
    onConfirm?.();

    if (autoResetDelay > 0) {
      setTimeout(() => {
        setIsConfirmed(false);
        animate(x, 0, motionTransitions.springResponsive);
        onReset?.();
      }, autoResetDelay);
    }
  };

  const getActionIcon = () => {
    switch (actionType) {
      case 'delete':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'unlock':
        return <Lock className="w-4 h-4 text-amber-400" />;
      default:
        return <ChevronRight className="w-4 h-4 text-white" />;
    }
  };

  return (
    <div className={cn('w-full max-w-sm font-sans select-none', className)}>
      <div
        ref={trackRef}
        className={cn(
          'relative h-[52px] rounded-full border p-1 flex items-center overflow-hidden transition-colors',
          isConfirmed
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-[#0E0E0E] border-[#1F1F1F]',
          disabled && 'opacity-30 cursor-not-allowed'
        )}
      >
        {/* Dynamic reactive fill background */}
        <motion.div
          style={{ opacity: trackBgOpacity }}
          className={cn(
            'absolute inset-0 z-0 transition-opacity',
            actionType === 'delete'
              ? 'bg-rose-950/20'
              : 'bg-[#141414]'
          )}
        />

        {/* Track Label */}
        <motion.div
          style={{ opacity: textOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-medium tracking-wide text-[#A1A1A1] z-10"
        >
          {isConfirmed ? '' : label}
        </motion.div>

        {/* Confirmed Label State */}
        {isConfirmed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-semibold text-emerald-400 z-10"
          >
            {confirmedLabel}
          </motion.div>
        )}

        {/* Draggable Handle Button */}
        <motion.div
          drag={disabled || isConfirmed ? false : 'x'}
          dragConstraints={{ left: 0, right: dragMax }}
          dragElastic={0.05}
          dragMomentum={false}
          style={{ x }}
          onDragEnd={handleDragEnd}
          whileTap={disabled ? undefined : { scale: 0.96 }}
          className={cn(
            'w-[44px] h-[44px] rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-20 shadow-xs relative focus-ring',
            isConfirmed
              ? 'bg-emerald-500 text-white border-transparent'
              : actionType === 'delete'
              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
              : 'bg-[#141414] border border-[#1F1F1F] text-[#FAFAFA] hover:bg-[#171717]'
          )}
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={isConfirmed ? 100 : 0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleKeyboardConfirm();
            }
          }}
        >
          {isConfirmed ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={motionTransitions.springSnappy}
            >
              <Check className="w-5 h-5 text-black stroke-[2.5]" />
            </motion.div>
          ) : (
            getActionIcon()
          )}
        </motion.div>
      </div>

      {/* Accessible fallback keyboard button */}
      <div className="sr-only">
        <button
          type="button"
          onClick={handleKeyboardConfirm}
          disabled={disabled || isConfirmed}
        >
          {label}
        </button>
      </div>
    </div>
  );
};





This too
