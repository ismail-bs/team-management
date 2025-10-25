import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MeetingsService } from './meetings.service.js';
import {
  CreateMeetingDto,
  UpdateMeetingDto,
  ParticipantResponseDto,
  MeetingQueryDto,
  MeetingResponseDto,
} from './dto/meeting.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface.js';

@ApiTags('meetings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @ApiOperation({
    summary: 'Create a new meeting (Admin & Project Manager only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Meeting created successfully',
    type: MeetingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Only Admin and Project Manager can create meetings',
  })
  async create(
    @Body() createMeetingDto: CreateMeetingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.meetingsService.create(createMeetingDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all meetings for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Meetings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/MeetingResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiQuery({
    name: 'project',
    required: false,
    description: 'Filter by project ID',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by meeting type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by meeting status',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for date range filter',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for date range filter',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async findAll(
    @Query() query: MeetingQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.meetingsService.findAll(
      query,
      req.user?.sub,
      req.user?.role,
    );

    // Transform to standard paginated response format
    return {
      data: result.meetings,
      total: result.total,
      page: result.page,
      limit: query.limit || 10,
      totalPages: result.totalPages,
    };
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming meetings for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Upcoming meetings retrieved successfully',
    type: [MeetingResponseDto],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of meetings to return',
  })
  async getUpcoming(
    @Query('limit') limit: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    const meetings = await this.meetingsService.getUpcomingMeetings(
      req.user.sub,
      limitNumber,
      req.user.role,
    );
    return meetings;
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get meetings for a specific project' })
  @ApiResponse({
    status: 200,
    description: 'Project meetings retrieved successfully',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  async getMeetingsByProject(
    @Param('projectId') projectId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.meetingsService.getMeetingsByProject(projectId, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a meeting by ID' })
  @ApiResponse({
    status: 200,
    description: 'Meeting retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async findOne(@Param('id') id: string) {
    return this.meetingsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a meeting' })
  @ApiResponse({
    status: 200,
    description: 'Meeting updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only organizer can update',
  })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async update(
    @Param('id') id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.meetingsService.update(id, updateMeetingDto, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a meeting' })
  @ApiResponse({ status: 204, description: 'Meeting deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only organizer can delete',
  })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async remove(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.meetingsService.remove(id, req.user.sub, req.user.role);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Respond to a meeting invitation' })
  @ApiResponse({
    status: 200,
    description: 'Response recorded successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a participant' })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async respondToMeeting(
    @Param('id') id: string,
    @Body() responseDto: ParticipantResponseDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.meetingsService.respondToMeeting(id, req.user.sub, responseDto);
  }
}
