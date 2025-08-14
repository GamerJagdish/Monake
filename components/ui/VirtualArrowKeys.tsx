"use client";
import React, { useCallback, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface VirtualArrowKeysProps {
  onDirectionPress: (direction: { x: number; y: number }) => void;
  disabled?: boolean;
  className?: string;
}

const VirtualArrowKeys: React.FC<VirtualArrowKeysProps> = ({
  onDirectionPress,
  disabled = false,
  className = ""
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const handleKeyPress = useCallback((direction: { x: number; y: number }, keyName: string) => {
    if (disabled) return;
    
    setActiveKey(keyName);
    onDirectionPress(direction);
    
    // Reset active state after a short delay for visual feedback
    setTimeout(() => setActiveKey(null), 150);
  }, [onDirectionPress, disabled]);

  const handleTouchStart = useCallback((direction: { x: number; y: number }, keyName: string) => {
    handleKeyPress(direction, keyName);
  }, [handleKeyPress]);

  const handleMouseDown = useCallback((direction: { x: number; y: number }, keyName: string) => {
    handleKeyPress(direction, keyName);
  }, [handleKeyPress]);

  const keyStyle = "w-16 h-14 bg-gray-800/90 hover:bg-gray-700/90 active:bg-gray-600/90 border border-gray-600 rounded-lg flex items-center justify-center text-white shadow-md transition-all duration-100 ease-out select-none";
  const activeKeyStyle = "w-16 h-14 bg-green-600/90 border border-green-500 rounded-lg flex items-center justify-center text-white shadow-md transition-all duration-100 ease-out select-none transform scale-95";

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`} style={{ touchAction: 'manipulation' }}>
      {/* Top row - Up arrow */}
      <div className="flex justify-center">
        <button
          className={activeKey === 'up' ? activeKeyStyle : keyStyle}
          onMouseDown={() => handleMouseDown({ x: 0, y: -1 }, 'up')}
          onTouchStart={(e) => {
            e.preventDefault();
            handleTouchStart({ x: 0, y: -1 }, 'up');
          }}
          disabled={disabled}
          aria-label="Move Up"
        >
          <ChevronUp size={24} strokeWidth={2.5} />
        </button>
      </div>

      {/* Bottom row - Left, Down, Right arrows (wider spacing for big hands) */}
      <div className="flex gap-2">
        <button
          className={activeKey === 'left' ? activeKeyStyle : keyStyle}
          onMouseDown={() => handleMouseDown({ x: -1, y: 0 }, 'left')}
          onTouchStart={(e) => {
            e.preventDefault();
            handleTouchStart({ x: -1, y: 0 }, 'left');
          }}
          disabled={disabled}
          aria-label="Move Left"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <button
          className={activeKey === 'down' ? activeKeyStyle : keyStyle}
          onMouseDown={() => handleMouseDown({ x: 0, y: 1 }, 'down')}
          onTouchStart={(e) => {
            e.preventDefault();
            handleTouchStart({ x: 0, y: 1 }, 'down');
          }}
          disabled={disabled}
          aria-label="Move Down"
        >
          <ChevronDown size={24} strokeWidth={2.5} />
        </button>
        <button
          className={activeKey === 'right' ? activeKeyStyle : keyStyle}
          onMouseDown={() => handleMouseDown({ x: 1, y: 0 }, 'right')}
          onTouchStart={(e) => {
            e.preventDefault();
            handleTouchStart({ x: 1, y: 0 }, 'right');
          }}
          disabled={disabled}
          aria-label="Move Right"
        >
          <ChevronRight size={24} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default VirtualArrowKeys;