import { HomeBanner, GlobalJapaCount, HomeMantra, UserJapaProject, TodayJapaProgress, UpcomingFestival } from './home.types';

import mysql from '../../database/mysql';


class HomeRepository {


  async getHomeBanner(): Promise<HomeBanner> {

    const rows = await mysql.query<any[]>(
      `
      SELECT 
        setting_key,
        setting_value
      FROM app_settings
      WHERE setting_key IN
      (
        'home_banner_image',
        'home_banner_title',
        'home_banner_description',
        'home_banner_action'
      )
      AND is_active = 1
      `,
    );


    const banner: HomeBanner = {
      image: null,
      title: null,
      description: null,
      action: null,
    };


    rows.forEach((item) => {

      switch(item.setting_key) {

        case 'home_banner_image':
          banner.image = item.setting_value;
          break;

        case 'home_banner_title':
          banner.title = item.setting_value;
          break;

        case 'home_banner_description':
          banner.description = item.setting_value;
          break;

        case 'home_banner_action':
          banner.action = item.setting_value;
          break;

      }

    });


    return banner;

  }



  async getGlobalJapaCount(userId: number): Promise<GlobalJapaCount> {
    const [globalRows, userRows] = await Promise.all([
      mysql.query<any[]>(
        `
        SELECT COALESCE(SUM(session_count), 0) AS totalJapaCount
        FROM japa_sessions
        `,
      ),
      mysql.query<any[]>(
        `
        SELECT COALESCE(SUM(session_count), 0) AS userJapaCount
        FROM japa_sessions
        WHERE user_id = ?
        `,
        [userId],
      ),
    ]);

    return {
      totalJapaCount: Number(globalRows[0]?.totalJapaCount ?? 0) || 0,
      userJapaCount: Number(userRows[0]?.userJapaCount ?? 0) || 0,
    };
  }




  async getFeaturedMantras(): Promise<HomeMantra[]> {

    return mysql.query<HomeMantra[]>(
      `
      SELECT
        id,
        mantra_name AS mantraName,
        deity_name AS deityName,
        transliteration,
        image_url AS imageUrl,
        is_featured AS isFeatured
      FROM mantras
      WHERE is_active = 1
      AND is_featured = 1
      ORDER BY display_order ASC
      `,
    );

  }




  async getUserProjects(
    userId:number,
  ): Promise<UserJapaProject[]> {


    return mysql.query<UserJapaProject[]>(
      `
      SELECT

        j.id,

        j.goal_name AS goalName,

        j.mantra_type AS mantraType,

        j.mantra_id AS mantraId,

        j.personal_mantra_id AS personalMantraId,

        COALESCE(
          m.mantra_name,
          upm.mantra_name
        ) AS mantraName,

        j.target_count AS targetCount,

        COALESCE((
          SELECT SUM(js.session_count)
          FROM japa_sessions js
          WHERE js.japa_goal_id = j.id
          AND js.user_id = j.user_id
        ), 0) AS completedCount,

        CASE
          WHEN j.target_count - COALESCE((
            SELECT SUM(js.session_count)
            FROM japa_sessions js
            WHERE js.japa_goal_id = j.id
            AND js.user_id = j.user_id
          ), 0) < 0 THEN 0
          ELSE j.target_count - COALESCE((
            SELECT SUM(js.session_count)
            FROM japa_sessions js
            WHERE js.japa_goal_id = j.id
            AND js.user_id = j.user_id
          ), 0)
        END AS remainingCount,

        j.daily_target AS dailyTarget,

        j.start_date AS startDate,

        j.end_date AS endDate,

        j.status

      FROM japa_goals j

      LEFT JOIN mantras m
        ON m.id = j.mantra_id

      LEFT JOIN user_personal_mantras upm
        ON upm.id = j.personal_mantra_id

      WHERE j.user_id = ?

      AND j.status = 'ACTIVE'

      ORDER BY j.created_at DESC
      `,
      [
        userId,
      ],
    );

  }




  async getUpcomingFestival(): Promise<UpcomingFestival | null> {


    const rows =
      await mysql.query<UpcomingFestival[]>(
        `
        SELECT

          id,

          festival_name AS festivalName,

          description,

          festival_date AS festivalDate,

          festival_type AS festivalType

        FROM festivals

        WHERE festival_date >= CURDATE()

        AND is_active = 1

        ORDER BY festival_date ASC

        LIMIT 1
        `,
      );


    return rows.length
      ? rows[0]
      : null;

  }




  async getTodayProgress(
    userId:number,
  ): Promise<TodayJapaProgress> {


    const [todayRows, projectRows] = await Promise.all([
      mysql.query<any[]>(
        `
        SELECT COALESCE(SUM(session_count), 0) AS todayCount
        FROM japa_sessions
        WHERE user_id = ?
        AND DATE(created_at) = CURDATE()
        `,
        [userId],
      ),
      mysql.query<any[]>(
        `
        SELECT
          COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completedProjects,
          COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END), 0) AS totalActiveProjects
        FROM japa_goals
        WHERE user_id = ?
        `,
        [userId],
      ),
    ]);

    return {
      todayCount: Number(todayRows[0]?.todayCount ?? 0) || 0,
      completedProjects: Number(projectRows[0]?.completedProjects ?? 0) || 0,
      totalActiveProjects: Number(projectRows[0]?.totalActiveProjects ?? 0) || 0,
    };

  }


}


export default new HomeRepository();