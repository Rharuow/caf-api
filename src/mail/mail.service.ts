import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { Owner, Resident, User } from '@prisma/client';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendInviteUser(
    user: Pick<User, 'name' | 'id'> & {
      owner?: Pick<Owner, 'email' | 'id'>;
    } & {
      resident?: Pick<Resident, 'email' | 'id'>;
    },
  ) {
    const url =
      process.env.PLATAFORM_URL +
      (user.owner
        ? `/signup?id=${user.id}&ownerId=${user.owner.id}`
        : `/signup?id=${user.id}&residentId=${user.resident.id}`);

    await this.mailerService.sendMail({
      to: user.owner ? user.owner.email : user.resident.email,
      // from: '"Support Team" <support@example.com>', // override default from
      subject: 'Bem vindo ao CAF! Confirme seu email',
      template: './invite', // `.hbs` extension is appended automatically
      context: {
        // ✏️ filling curly brackets with content
        name: user.name,
        clientName: process.env.CLIENT_NAME,
        url,
      },
    });
  }

  async sendParcelRecivied({
    users,
  }: {
    users: Array<{ name: string; email: string }>;
  }) {
    for (const user of users) {
      await this.mailerService.sendMail({
        to: user.email,
        // from: '"Support Team" <support@example.com>', // override default from
        subject: 'Entrega recebida pela portaria',
        template: './parcelRecevied', // `.hbs` extension is appended automatically
        context: {
          // ✏️ filling curly brackets with content
          name: user.name,
          clientName: process.env.CLIENT_NAME,
        },
      });
    }
  }

  async sendParcelBlocked({
    users,
  }: {
    users: Array<{ name: string; email: string }>;
  }) {
    for (const user of users) {
      await this.mailerService.sendMail({
        to: user.email,
        // from: '"Support Team" <support@example.com>', // override default from
        subject: 'Problemas com a sua entrega',
        template: './parcelBlocked', // `.hbs` extension is appended automatically
        context: {
          // ✏️ filling curly brackets with content
          name: user.name,
          clientName: process.env.CLIENT_NAME,
        },
      });
    }
  }

  async sendUserValidation(user: Pick<User, 'name'> & Pick<Owner, 'email'>) {
    const url = process.env.PLATAFORM_URL;

    await this.mailerService.sendMail({
      to: user.email,
      // from: '"Support Team" <support@example.com>', // override default from
      subject: 'Time CAF! Sua conta foi ativada com sucesso.',
      template: './available', // `.hbs` extension is appended automatically
      context: {
        // ✏️ filling curly brackets with content
        name: user.name,
        clientName: process.env.CLIENT_NAME,
        url,
      },
    });
  }

  async sendResidentConfirmation({
    recipient,
    sender,
  }: {
    recipient: Pick<User, 'name' | 'id'> & Pick<Resident, 'email'>;
    sender: Pick<User, 'name'>;
  }) {
    const url =
      process.env.PLATAFORM_URL +
      `/confirmation-password?token=${recipient.id}`;

    await this.mailerService.sendMail({
      to: recipient.email,
      // from: '"Support Team" <support@example.com>', // override default from
      subject: 'Bem vindo ao CAF! Confirme seu email',
      template: './confirmationPassword', // `.hbs` extension is appended automatically
      context: {
        // ✏️ filling curly brackets with content
        recipient: {
          name: recipient.name,
        },
        sender: {
          name: sender.name,
        },
        clientName: process.env.CLIENT_NAME || 'Controle de Ambientes Físicos',
        url,
      },
    });
  }
}
