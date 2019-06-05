import pool from '../database/database-connection';
import { Campground } from '../model/Campground';
import { Comment } from '../model/Comment';
import { BaseRepository } from './BaseRepository';


export default class CampgroundRepository implements BaseRepository<Campground> {
  findAll(callback: any): void {
    pool.query('SELECT * FROM campgrounds', null).then(
      (results: Campground[]) => callback(results)
    );
  }

  findOneById(id: number, callback: any): void {
    pool.query('SELECT * FROM campgrounds WHERE id = ?', [id]).then((campResult: Campground) => {
      let campground: any = [];
      let comments: any = [];

      pool.query('SELECT * FROM comments WHERE campground_id = ?', [id]).then((commentResult: Comment[]) => {
        campground = campResult[0];
        comments = commentResult;

        callback({ campground, comments });
      });
    });
  }

  createOne(campground: Campground, callback: any): void {
    pool.query('INSERT INTO campgrounds SET ?', campground).then(
      (result: any) => callback({ campground_id: result.insertId })
    );
  }

  updateOne(campground: Campground): void {
    pool.query('UPDATE campgrounds SET ? WHERE id = ?', [campground, campground.id]);
  }

  deleteOne(id: number): void {
    pool.query('DELETE FROM campgrounds WHERE id = ?', [id]);
  }
}
