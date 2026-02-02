import { useEffect, useState } from "react";

export const CursorGlow = () => {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const updatePosition = (e: MouseEvent) => {
            setPosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener("mousemove", updatePosition);

        return () => window.removeEventListener("mousemove", updatePosition);
    }, []);

    return (
        <div
            className="pointer-events-none fixed z-50 h-96 w-96 rounded-full opacity-20 blur-3xl transition-transform duration-75 ease-out"
            style={{
                background: "radial-gradient(circle, #ED6839 0%, rgba(237, 104, 57, 0) 70%)",
                left: -192, // Half of width (384px / 2) to center
                top: -192,  // Half of height (384px / 2) to center
                transform: `translate(${position.x}px, ${position.y}px)`,
                willChange: "transform",
            }}
        />
    );
};
