import {Router, Request, Response} from 'express';

import mysql from '../../database/mysql';
import challengeRepository from '../challenge/challenge.repository';
import challengeService from '../challenge/challenge.service';
import {demoUserSql} from '../../utils/demoData';

const router = Router();

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Public read-only payload for japasiddhi.com.
 * Safe fields only — no auth, no PII, no admin actions.
 */
router.get('/website', async (req: Request, res: Response) => {
  try {
    const [challengeRows, rewardRows, usersRows, japaGlobal, japaSessions] =
      await Promise.all([
        challengeService.getActiveChallenges(undefined),
        challengeRepository.listRewards(),
        mysql.query<any[]>(`
          SELECT COUNT(*) AS totalUsers
          FROM users u
          WHERE u.deleted_at IS NULL
          ${demoUserSql('u')}
        `),
        mysql.query<any[]>(`
          SELECT total_japa_count AS totalJapa
          FROM global_japa_counter
          WHERE id = 1
        `),
        mysql.query<any[]>(`
          SELECT IFNULL(SUM(session_count), 0) AS totalJapa
          FROM japa_sessions
          WHERE (
            remarks IS NULL
            OR TRIM(remarks) = ''
            OR (
              lower(remarks) NOT LIKE 'challenge%'
              AND lower(remarks) NOT LIKE '%challenge japa%'
            )
          )
        `),
      ]);

    const challenges = (challengeRows || []).map((row: any) => ({
      id: Number(row.id),
      title: String(row.title || ''),
      description: String(row.description || ''),
      challengeType: String(row.challengeType || ''),
      targetValue: num(row.targetValue),
      startDate: row.startDate || null,
      endDate: row.endDate || null,
      mantra: String(row.mantra || ''),
      rewardName: String(row.rewardName || ''),
    }));

    const {absoluteMediaUrl} = await import('../../utils/mediaUrl');
    const rewards = (rewardRows || []).map((row: any) => {
      const adminMarkedOos =
        Number(row.adminMarkedOos ?? row.admin_marked_oos ?? 0) === 1;
      const rawImage = String(row.imageUrl || row.image_url || '').trim();
      return {
        id: Number(row.id),
        // Exact admin title — do not remap to catalog names.
        name: String(row.name || ''),
        description: String(row.description || ''),
        imageUrl: rawImage ? absoluteMediaUrl(req, rawImage) : null,
        // Availability = admin In/Out toggle (qty is label only).
        inStock: !adminMarkedOos,
      };
    });

    const users = num(usersRows?.[0]?.totalUsers);
    const globalJapa = num(japaGlobal?.[0]?.totalJapa);
    const sessionJapa = num(japaSessions?.[0]?.totalJapa);

    return res.json({
      success: true,
      message: 'Website data fetched',
      data: {
        updatedAt: new Date().toISOString(),
        stats: {
          users,
          japas: Math.max(globalJapa, sessionJapa),
          challenges: challenges.length,
          rewardsInStock: rewards.filter(item => item.inStock).length,
        },
        challenges,
        rewards,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to load website data.',
    });
  }
});

export default router;
