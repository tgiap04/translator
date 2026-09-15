// Ham thuan dinh vi tooltip - khong import gi, khong dung DOM, de test doc lap.
// Cong thuc: uu tien duoi selection, khong du cho thi lat len; kep trong ca bon
// mep viewport; doi sang toa do trang (cong scrollX/scrollY) de tooltip tu troi
// theo scroll (da xac minh thuc nghiem: position:absolute tren popover top-layer
// van bam toa do trang, xem muc Architecture trong phase-06).

export interface PlaceRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
  readonly bottom: number;
}

export interface PlaceSize {
  readonly width: number;
  readonly height: number;
}

export interface PlaceViewport {
  readonly width: number;
  readonly height: number;
}

export interface PlaceScroll {
  readonly x: number;
  readonly y: number;
}

export interface PlacedPosition {
  readonly top: number;
  readonly left: number;
}

const DEFAULT_MARGIN = 8;

/**
 * Kep value vao [min, max]. Neu max < min (vd tooltip rong hon khoang trong
 * con lai sau khi tru le), uu tien giu mep min de canh trai/tren luon thay duoc.
 */
function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

export function place(
  rect: PlaceRect,
  size: PlaceSize,
  viewport: PlaceViewport,
  scroll: PlaceScroll,
  margin: number = DEFAULT_MARGIN,
): PlacedPosition {
  const spaceBelow = viewport.height - rect.bottom;
  const spaceAbove = rect.top;

  let top: number;
  if (spaceBelow >= size.height + margin) {
    top = rect.bottom + margin;
  } else if (spaceAbove >= size.height + margin) {
    top = rect.top - size.height - margin;
  } else {
    // ca hai phia deu chat -> net vua trong viewport, uu tien phia duoi
    top = clamp(rect.bottom + margin, margin, viewport.height - size.height - margin);
  }

  const left = clamp(
    rect.left + rect.width / 2 - size.width / 2,
    margin,
    viewport.width - size.width - margin,
  );

  return {
    top: top + scroll.y,
    left: left + scroll.x,
  };
}
