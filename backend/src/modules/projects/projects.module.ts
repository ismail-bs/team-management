import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project, ProjectSchema } from './schemas/project.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Meeting, MeetingSchema } from '../meetings/schemas/meeting.schema';
import {
  DocumentModel,
  DocumentSchema,
} from '../documents/schemas/document.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ChatModule } from '../chat/chat.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Meeting.name, schema: MeetingSchema },
      { name: DocumentModel.name, schema: DocumentSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => ChatModule),
    EmailModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
