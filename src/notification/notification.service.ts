import { Injectable } from '@nestjs/common';
import { ROLE } from '@prisma/client';
import * as firebase from 'firebase-admin';
import * as path from 'path';
import { PrismaService } from 'src/prisma/prisma.service';

firebase.initializeApp({
  credential: firebase.credential.cert(
    path.join(__dirname, '..', '..', 'firebase-adminsdk.json'),
  ),
});

@Injectable()
export class NotificationService {
  constructor(private readonly prismaService: PrismaService) {}

  acceptPushNotification = async ({
    userId,
    token,
  }: {
    userId: string;
    token: string;
  }) => {
    try {
      const user = await this.prismaService.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        include: {
          role: true,
          owner: true,
          resident: {
            include: {
              owner: true,
            },
          },
        },
      });

      const notificationToken =
        await this.prismaService.notificationToken.findUnique({
          where: { token },
        });

      await firebase
        .messaging()
        .subscribeToTopic(token, `role-${user.role.name}`);

      if (user.role.name === 'OWNER')
        await firebase
          .messaging()
          .subscribeToTopic(
            token,
            `address-${user.owner.square}-${user.owner.house}`,
          );
      if (user.role.name === 'RESIDENT')
        await firebase
          .messaging()
          .subscribeToTopic(
            token,
            `address-${user.resident.owner.square}-${user.resident.owner.house}`,
          );

      if (Boolean(notificationToken)) return;
      await this.prismaService.notificationToken.create({
        data: {
          user: {
            connect: {
              id: userId,
            },
          },
          token,
        },
      });
    } catch (error) {
      throw error;
    }
  };

  disablePushNotification = async (token: string) => {
    try {
      await this.prismaService.notificationToken.update({
        where: {
          token,
        },
        data: {
          deletedAt: Date(),
        },
      });
    } catch (error) {
      throw error;
    }
  };

  getNotifications = async (): Promise<any> => {};

  sendPush = async (
    userId: string,
    token: string,
    title: string,
    body: string,
  ): Promise<void> => {
    try {
      const notificationToken =
        await this.prismaService.notificationToken.findUniqueOrThrow({
          where: {
            token,
            status: 'ACTIVE',
          },
        });

      await firebase
        .messaging()
        .send({
          notification: {
            title,
            body,
          },
          token: notificationToken.token,
          android: { priority: 'high' },
        })
        .catch((error) => {
          throw error;
        });

      await this.prismaService.notification.create({
        data: {
          body,
          title,
          user: {
            connect: {
              id: userId,
            },
          },
          notificationToken: {
            connect: {
              token,
            },
          },
        },
      });
    } catch (error) {
      throw error;
    }
  };

  sendPushByRole = async ({
    role,
    title,
    body,
  }: {
    role: ROLE;
    title: string;
    body: string;
  }): Promise<void> => {
    let link = process.env.COND_URL;
    if (role === 'SECURITY') link = process.env.SECURITY_URL;
    if (role === 'ADMIN' || role === 'ROOT') link = process.env.ADMIN_URL;
    try {
      await firebase
        .messaging()
        .sendToTopic(`role-${role}`, {
          notification: {
            title,
            body,
          },
          data: {
            link,
            icon: process.env.LOGO_URL,
          },
        })
        .catch((error) => {
          throw error;
        });
    } catch (error) {
      throw error;
    }
  };
}
