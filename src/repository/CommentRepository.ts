import pool from '../database/database-connection';
import { Comment } from '../model/Comment';
import { BaseRepository } from './BaseRepository';

export default class CommentRepository implements BaseRepository<Comment> {
  findAll(callback: any): void {
    // TODO
  }

  findOneById(id: number, callback: any): void {
    pool.query('SELECT * FROM comments WHERE id = ?', [id]).then(
      (result: any) => callback({ comment: result[0] })
    );
  }

  createOne(item: Comment, callback: any): void {
    pool.query('INSERT INTO comments SET ?', item).then(
      (result: any) => callback({ comment_id: result.insertId })
    );
  }

  updateOne(item: Comment): void {
    pool.query('UPDATE comments SET ? WHERE id = ?', [item, item.id]);
  }

  deleteOne(id: number): void {
    pool.query('DELETE FROM comments WHERE id = ?', [id]);
  }
}
