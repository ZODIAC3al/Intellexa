import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '../schemas/user.schema';
import { Workspace } from '../schemas/workspace.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Workspace.name) private workspaceModel: Model<Workspace>,
    private jwtService: JwtService
  ) {}

  async signup(email: string, passwordHash: string, name: string) {
    const existing = await this.userModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(passwordHash, salt);

    // Create the User document first without workspaceId
    const newUser = new this.userModel({
      email: email.toLowerCase(),
      passwordHash: hash,
      name,
      plan: 'local-core',
      settings: { theme: 'dark', defaultRetrievalStrategy: 'mmr' },
    });
    const savedUser = await newUser.save();

    // Create the default workspace for this user
    const slug = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const newWorkspace = new this.workspaceModel({
      name: `${name}'s Workspace`,
      slug: `${slug}_${Math.random().toString(36).substring(2, 6)}`,
      ownerId: savedUser._id,
      members: [{ userId: savedUser._id, role: 'owner' }],
      isPublic: false,
      publicCollectionIds: [],
    });
    const savedWorkspace = await newWorkspace.save();

    // Link the workspace back to the user
    savedUser.workspaceId = savedWorkspace._id as any;
    await savedUser.save();

    return {
      _id: savedUser._id,
      email: savedUser.email,
      name: savedUser.name,
      plan: savedUser.plan,
      workspaceId: savedWorkspace._id,
      avatar: savedUser.avatar,
    };
  }

  async login(email: string, passwordHash: string) {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedException('That email or password does not match an account');
    }

    const matched = await bcrypt.compare(passwordHash, user.passwordHash);
    if (!matched) {
      throw new UnauthorizedException('That email or password does not match an account');
    }

    const payload = { sub: user._id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        workspaceId: user.workspaceId,
        settings: user.settings,
        avatar: user.avatar,
      },
    };
  }
}
