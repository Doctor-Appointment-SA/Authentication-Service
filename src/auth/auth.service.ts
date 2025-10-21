import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private cfg: ConfigService,
    private prisma: PrismaService,
  ) {}

  async validateUser(username: string, pass: string) {
    // const user = await this.users.findByEmail(email);
    const user = await this.users.findByUserName(username);
    if (!user || !user.password) return null;
    const ok = await bcrypt.compare(pass, user.password);
    if (!ok) return null;
    return {
      id: user.id,
      name: user.name,
      lastname: user.lastname,
      role: user.role,
      health_benefits: user.health_benefits,
    };
  }

  private signAccessToken(payload: { sub: string; role: string }) {
    return this.jwt.signAsync(payload, {
      secret: this.cfg.get('JWT_ACCESS_SECRET'),
      expiresIn: this.cfg.get('JWT_ACCESS_EXPIRES') || '15m',
    });
  }

  private async issueRefreshToken(userId: string) {
    const expiresIn = this.cfg.get('JWT_REFRESH_EXPIRES') || '7d';
    const token = await this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.cfg.get('JWT_REFRESH_SECRET'),
        expiresIn,
      },
    );

    // store hashed token for rotation/revocation
    const hashed = await bcrypt.hash(token, 12);
    const expiresAt = new Date(Date.now() + this.parseMs(expiresIn));
    // await this.prisma.refreshToken.create({ data: { userId, hashed, expiresAt }});
    const id = require('crypto').randomUUID();
    await this.prisma.refresh_token.upsert({
      where: { userId: userId },
      update: { hashed, expiresAt, revoked: false },
      create: { userId, hashed, expiresAt, revoked: false },
    });
    return token;
  }

  private parseMs(span: string) {
    // tiny parser: 15m, 7d, 24h
    const m = span.match(/^(\d+)([smhd])$/);
    if (!m) return 0;
    const n = Number(m[1]);
    const unit = m[2];
    const mult =
      unit === 's'
        ? 1000
        : unit === 'm'
          ? 60000
          : unit === 'h'
            ? 3600000
            : 86400000;
    return n * mult;
  }

  async register(dto: {
    id_card: string;
    name?: string;
    lastname?: string;
    phone?: string;
    password: string;
    confirmPassword?: string;
  }) {
    console.log('AuthService dto:', dto);
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const user = await this.users.create({
      id_card: dto.id_card,
      name: dto.name,
      lastname: dto.lastname,
      phone: dto.phone,
      password: dto.password,
    });
    const tokens = await this.loginById(user.id, 'patient');
    return { user, ...tokens };
  }

  async login(username: string, password: string) {
    const valid = await this.validateUser(username, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (valid.role == null) throw new UnauthorizedException('Invalid role');
    const tokens = await this.loginById(valid.id, valid.role);
    return { user: valid, ...tokens };
  }

  private async loginById(id: string, role: string) {
    const access_token = await this.signAccessToken({ sub: id, role: role });
    const refresh_token = await this.issueRefreshToken(id);
    return { access_token, refresh_token };
  }

  async refresh(userId: string, incomingToken: string) {
    // verify signature first
    await this.jwt.verifyAsync(incomingToken, {
      secret: this.cfg.get('JWT_REFRESH_SECRET'),
    });
    // check it exists (and not revoked)
    const tokens = await this.prisma.refresh_token.findMany({
      where: { userId, revoked: false },
    });
    const match = await Promise.any(
      tokens.map((t: { hashed: string }) =>
        bcrypt.compare(incomingToken, t.hashed),
      ),
    ).catch(() => false);
    if (!match) throw new UnauthorizedException('Refresh token invalid');

    // rotate: revoke all old tokens for simplicity
    await this.prisma.refresh_token.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    // create new access_token, refresh_token
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const access_token = await this.signAccessToken({ sub: user.id, role: user.role || "" });
    const refresh_token = await this.issueRefreshToken(user.id);
    return { access_token, refresh_token };
  }

  async logout(userId: string) {
    await this.prisma.refresh_token.updateMany({
      where: { userId },
      data: { revoked: true },
    });
    return { ok: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true, // your HN
        id_card: true,
        name: true,
        lastname: true,
        phone: true,
        role: true,
        health_benefits: true, // String[] if you followed the array change
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
