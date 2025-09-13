import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';
import { instanceToPlain } from 'class-transformer';
import * as util from 'node:util';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private jwt: JwtService,
    private cfg: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    // console.log('DTO plain:', dto);
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    console.log('AuthController login DTO:', instanceToPlain(dto));
    return this.auth.login(dto.username, dto.password);
  }

  @Get('whoami')
  @UseGuards(JwtAuthGuard)
  async whoami(@Req() req: Request) {
    // console.log('whoami req.user:', util.inspect(req.user, { depth: null }));
    if (!req.user || !req.user.sub) throw new UnauthorizedException();
    const data = await this.auth.getMe(req.user.sub);
    return data;
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    const payload = await this.jwt.verifyAsync(body.refresh_token, {
      secret: this.cfg.get('JWT_REFRESH_SECRET'),
      ignoreExpiration: true,
    });
    return this.auth.refresh(payload.sub, body.refresh_token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: any) {
    return this.auth.logout(req.user.sub);
  }
}
