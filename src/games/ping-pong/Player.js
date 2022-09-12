import { CollisionBox } from "./CollisionBox";
export class Player {
    score = 0;
    board = new CollisionBox(15, 120, 30, 140, 100);
    update() {
    }
}
