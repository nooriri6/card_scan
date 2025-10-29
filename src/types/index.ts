export interface CardImage {
  id: string;
  uri: string;
  timestamp: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface CardCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}
