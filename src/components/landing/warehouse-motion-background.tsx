"use client";

import { useEffect, useRef } from "react";

type CargoKind = "carton" | "gear" | "wooden-crate";

type CargoSprite = {
  angle: number;
  kind: CargoKind;
  opacity: number;
  size: number;
  spin: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
};

type Palette = {
  accent: string;
  border: string;
  foreground: string;
  surface: string;
};

const spriteKinds: CargoKind[] = ["gear", "wooden-crate", "carton"];
const movementSpeedMultiplier = 1.25;

function colorWithAlpha(color: string, alpha: number) {
  const normalized = color.trim().replace("#", "");

  if (normalized.length !== 3 && normalized.length !== 6) {
    return color;
  }

  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;
  const value = Number.parseInt(hex, 16);

  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function readPalette(): Palette {
  const styles = window.getComputedStyle(document.documentElement);

  return {
    accent: styles.getPropertyValue("--accent").trim(),
    border: styles.getPropertyValue("--border").trim(),
    foreground: styles.getPropertyValue("--foreground").trim(),
    surface: styles.getPropertyValue("--surface").trim(),
  };
}

function createSprite(width: number, height: number): CargoSprite {
  const size = 26 + Math.random() * 42;
  const direction = Math.random() * Math.PI * 2;
  const speed = (9 + Math.random() * 18) * movementSpeedMultiplier;

  return {
    angle: Math.random() * Math.PI * 2,
    kind: spriteKinds[Math.floor(Math.random() * spriteKinds.length)] ?? "gear",
    opacity: 0.42 + Math.random() * 0.34,
    size,
    spin: (Math.random() - 0.5) * 0.34,
    velocityX: Math.cos(direction) * speed,
    velocityY: Math.sin(direction) * speed,
    x: size + Math.random() * Math.max(1, width - size * 2),
    y: size + Math.random() * Math.max(1, height - size * 2),
  };
}

function drawGear(context: CanvasRenderingContext2D, sprite: CargoSprite, palette: Palette) {
  const teeth = 12;
  const outerRadius = sprite.size / 2;
  const innerRadius = outerRadius * 0.72;

  context.save();
  context.translate(sprite.x, sprite.y);
  context.rotate(sprite.angle);
  context.beginPath();

  for (let index = 0; index < teeth * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = (index / (teeth * 2)) * Math.PI * 2;
    const pointX = Math.cos(angle) * radius;
    const pointY = Math.sin(angle) * radius;

    if (index === 0) {
      context.moveTo(pointX, pointY);
    } else {
      context.lineTo(pointX, pointY);
    }
  }

  context.closePath();
  context.fillStyle = colorWithAlpha(palette.accent, 0.06 * sprite.opacity);
  context.strokeStyle = colorWithAlpha(palette.foreground, 0.2 * sprite.opacity);
  context.lineWidth = 1.4;
  context.fill();
  context.stroke();
  context.beginPath();
  context.arc(0, 0, outerRadius * 0.28, 0, Math.PI * 2);
  context.fillStyle = colorWithAlpha(palette.surface, 0.88);
  context.fill();
  context.stroke();
  context.restore();
}

function drawCarton(context: CanvasRenderingContext2D, sprite: CargoSprite, palette: Palette) {
  const half = sprite.size / 2;

  context.save();
  context.translate(sprite.x, sprite.y);
  context.rotate(sprite.angle);
  context.fillStyle = colorWithAlpha(palette.accent, 0.075 * sprite.opacity);
  context.strokeStyle = colorWithAlpha(palette.accent, 0.26 * sprite.opacity);
  context.lineWidth = 1.2;
  context.fillRect(-half, -half, sprite.size, sprite.size);
  context.strokeRect(-half, -half, sprite.size, sprite.size);
  context.beginPath();
  context.moveTo(0, -half);
  context.lineTo(0, half);
  context.strokeStyle = colorWithAlpha(palette.foreground, 0.15 * sprite.opacity);
  context.stroke();
  context.fillStyle = colorWithAlpha(palette.surface, 0.76);
  context.fillRect(-half * 0.12, -half, half * 0.24, sprite.size);
  context.restore();
}

function drawWoodenCrate(context: CanvasRenderingContext2D, sprite: CargoSprite, palette: Palette) {
  const half = sprite.size / 2;

  context.save();
  context.translate(sprite.x, sprite.y);
  context.rotate(sprite.angle);
  context.fillStyle = colorWithAlpha(palette.foreground, 0.045 * sprite.opacity);
  context.strokeStyle = colorWithAlpha(palette.border, 0.72 * sprite.opacity);
  context.lineWidth = 1.2;
  context.fillRect(-half, -half, sprite.size, sprite.size);
  context.strokeRect(-half, -half, sprite.size, sprite.size);
  context.beginPath();
  context.moveTo(-half, -half * 0.36);
  context.lineTo(half, -half * 0.36);
  context.moveTo(-half, half * 0.36);
  context.lineTo(half, half * 0.36);
  context.moveTo(-half * 0.88, -half * 0.88);
  context.lineTo(half * 0.88, half * 0.88);
  context.moveTo(half * 0.88, -half * 0.88);
  context.lineTo(-half * 0.88, half * 0.88);
  context.strokeStyle = colorWithAlpha(palette.foreground, 0.17 * sprite.opacity);
  context.stroke();
  context.restore();
}

function drawSprite(context: CanvasRenderingContext2D, sprite: CargoSprite, palette: Palette) {
  if (sprite.kind === "gear") {
    drawGear(context, sprite, palette);
    return;
  }

  if (sprite.kind === "carton") {
    drawCarton(context, sprite, palette);
    return;
  }

  drawWoodenCrate(context, sprite, palette);
}

function resolveSpriteCollision(first: CargoSprite, second: CargoSprite) {
  const deltaX = second.x - first.x;
  const deltaY = second.y - first.y;
  const minimumDistance = (first.size + second.size) / 2;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance >= minimumDistance) {
    return;
  }

  const normalX = distance === 0 ? 1 : deltaX / distance;
  const normalY = distance === 0 ? 0 : deltaY / distance;
  const overlap = minimumDistance - distance;
  const firstMass = first.size ** 2;
  const secondMass = second.size ** 2;
  const inverseFirstMass = 1 / firstMass;
  const inverseSecondMass = 1 / secondMass;
  const totalInverseMass = inverseFirstMass + inverseSecondMass;

  first.x -= normalX * overlap * (inverseFirstMass / totalInverseMass);
  first.y -= normalY * overlap * (inverseFirstMass / totalInverseMass);
  second.x += normalX * overlap * (inverseSecondMass / totalInverseMass);
  second.y += normalY * overlap * (inverseSecondMass / totalInverseMass);

  const relativeVelocity =
    (second.velocityX - first.velocityX) * normalX + (second.velocityY - first.velocityY) * normalY;

  if (relativeVelocity >= 0) {
    return;
  }

  const restitution = 0.92;
  const impulse = (-(1 + restitution) * relativeVelocity) / totalInverseMass;

  first.velocityX -= impulse * inverseFirstMass * normalX;
  first.velocityY -= impulse * inverseFirstMass * normalY;
  second.velocityX += impulse * inverseSecondMass * normalX;
  second.velocityY += impulse * inverseSecondMass * normalY;
}

export function WarehouseMotionBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let lastTimestamp = 0;
    let palette = readPalette();
    let width = 0;
    let height = 0;
    let sprites: CargoSprite[] = [];

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const spriteCount = Math.max(9, Math.min(22, Math.round((width * height) / 85000)));
      sprites = Array.from({ length: spriteCount }, () => createSprite(width, height));
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      sprites.forEach((sprite) => drawSprite(context, sprite, palette));
    };

    const update = (deltaSeconds: number) => {
      sprites.forEach((sprite) => {
        const radius = sprite.size / 2;
        sprite.x += sprite.velocityX * deltaSeconds;
        sprite.y += sprite.velocityY * deltaSeconds;
        sprite.angle += sprite.spin * deltaSeconds;

        if (sprite.x - radius <= 0 || sprite.x + radius >= width) {
          sprite.velocityX *= -1;
          sprite.x = Math.min(Math.max(sprite.x, radius), width - radius);
        }

        if (sprite.y - radius <= 0 || sprite.y + radius >= height) {
          sprite.velocityY *= -1;
          sprite.y = Math.min(Math.max(sprite.y, radius), height - radius);
        }
      });

      for (let firstIndex = 0; firstIndex < sprites.length - 1; firstIndex += 1) {
        const first = sprites[firstIndex];

        if (!first) {
          continue;
        }

        for (let secondIndex = firstIndex + 1; secondIndex < sprites.length; secondIndex += 1) {
          const second = sprites[secondIndex];

          if (second) {
            resolveSpriteCollision(first, second);
          }
        }
      }
    };

    const animate = (timestamp: number) => {
      const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.04);
      lastTimestamp = timestamp;
      update(deltaSeconds);
      draw();
      animationFrame = window.requestAnimationFrame(animate);
    };

    const stop = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };

    const start = () => {
      if (!reduceMotion.matches && !document.hidden && !animationFrame) {
        lastTimestamp = performance.now();
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    const handleReducedMotion = () => {
      stop();
      draw();
      start();
    };

    const themeObserver = new MutationObserver(() => {
      palette = readPalette();
      draw();
    });

    resize();
    draw();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    reduceMotion.addEventListener("change", handleReducedMotion);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      reduceMotion.removeEventListener("change", handleReducedMotion);
      themeObserver.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="warehouse-motion-background" aria-hidden="true" />;
}
