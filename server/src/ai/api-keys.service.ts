import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { API_KEY_SCOPES, ApiKey, ApiKeyScope } from '../database/entities/api-key.entity';
import { AiActivity } from '../database/entities/ai-activity.entity';

const MAX_KEYS_PER_USER = 20;
const ACTIVITY_DAYS = 30;
export const KEY_PREFIX = 'mm_';

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

export type PublicApiKey = Pick<ApiKey, 'id' | 'name' | 'prefix' | 'scopes' | 'lastUsedAt' | 'createdAt'>;

const toPublic = ({ id, name, prefix, scopes, lastUsedAt, createdAt }: ApiKey): PublicApiKey => ({
  id,
  name,
  prefix,
  scopes,
  lastUsedAt,
  createdAt,
});

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey) private readonly keys: Repository<ApiKey>,
    @InjectRepository(AiActivity) private readonly activity: Repository<AiActivity>,
  ) {}

  async list(userId: string): Promise<PublicApiKey[]> {
    const keys = await this.keys.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return keys.map(toPublic);
  }

  /** Creates a key; the returned `key` is the only time it is ever visible. */
  async create(userId: string, name: string | undefined, scopes: unknown): Promise<PublicApiKey & { key: string }> {
    const cleanName = (name || '').trim().slice(0, 60) || 'AI assistant';
    const wanted = Array.isArray(scopes) ? scopes : [];
    const cleanScopes = API_KEY_SCOPES.filter((s) => wanted.includes(s));
    if (!cleanScopes.includes('read')) throw new BadRequestException('A key needs at least read access');
    if ((await this.keys.count({ where: { userId } })) >= MAX_KEYS_PER_USER) {
      throw new BadRequestException(`You can have up to ${MAX_KEYS_PER_USER} keys. Revoke one first.`);
    }
    const key = KEY_PREFIX + randomBytes(32).toString('base64url');
    const saved = await this.keys.save(
      this.keys.create({
        userId,
        name: cleanName,
        prefix: key.slice(0, KEY_PREFIX.length + 6),
        keyHash: hashKey(key),
        scopes: cleanScopes,
        lastUsedAt: null,
      }),
    );
    await this.log(userId, saved, 'key_created', `Key created with ${cleanScopes.join(', ')} access`);
    return { ...toPublic(saved), key };
  }

  async revoke(userId: string, id: string): Promise<void> {
    const key = await this.keys.findOne({ where: { id, userId } });
    if (!key) throw new NotFoundException();
    await this.keys.delete(key.id);
    await this.log(userId, key, 'key_revoked', 'Key revoked');
  }

  /** The key behind an Authorization header value, or null. */
  async authenticate(raw: string | undefined): Promise<ApiKey | null> {
    if (!raw?.startsWith(KEY_PREFIX) || raw.length > 200) return null;
    const key = await this.keys.findOne({ where: { keyHash: hashKey(raw) } });
    if (!key) return null;
    // Avoid a write per request: last-used is shown in minutes anyway
    if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 60_000) {
      key.lastUsedAt = new Date();
      await this.keys.update(key.id, { lastUsedAt: key.lastUsedAt });
    }
    return key;
  }

  async log(userId: string, key: Pick<ApiKey, 'id' | 'name'>, tool: string, summary: string, ok = true): Promise<void> {
    await this.activity.save(
      this.activity.create({ userId, keyId: key.id, keyName: key.name, tool, summary: summary.slice(0, 300), ok }),
    );
  }

  async recentActivity(userId: string, limit = 50): Promise<AiActivity[]> {
    // Old entries are pruned when someone looks
    await this.activity.delete({ createdAt: LessThan(new Date(Date.now() - ACTIVITY_DAYS * 86_400_000)) });
    return this.activity.find({ where: { userId }, order: { createdAt: 'DESC' }, take: Math.min(200, limit) });
  }
}
