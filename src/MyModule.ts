import { Module } from "@nestjs/common";

import { AttendanceTeachersController } from "./controllers/attendance/teachers/AttendanceTeachersController";
import { AttendanceStudentsController } from "./controllers/attendance/students/AttendanceStudentsController";
import { AttendanceParentsController } from "./controllers/attendance/parents/AttendanceParentsController";
import { AttendanceAdminsController } from "./controllers/attendance/admins/AttendanceAdminsController";
import { AttendanceSchoolsController } from "./controllers/attendance/schools/AttendanceSchoolsController";
import { AttendanceClassroomsController } from "./controllers/attendance/classrooms/AttendanceClassroomsController";
import { AttendanceAuthAccountsController } from "./controllers/attendance/auth/accounts/AttendanceAuthAccountsController";
import { AttendanceAuthSocialaccountsController } from "./controllers/attendance/auth/socialAccounts/AttendanceAuthSocialaccountsController";
import { AttendanceAuthSessionsController } from "./controllers/attendance/auth/sessions/AttendanceAuthSessionsController";
import { AttendanceAttendancerecordsController } from "./controllers/attendance/attendanceRecords/AttendanceAttendancerecordsController";
import { AttendanceAttendancecodesController } from "./controllers/attendance/attendanceCodes/AttendanceAttendancecodesController";
import { AttendanceAttendancecodelogsController } from "./controllers/attendance/attendanceCodeLogs/AttendanceAttendancecodelogsController";
import { AttendanceAttendancemethodsController } from "./controllers/attendance/attendanceMethods/AttendanceAttendancemethodsController";
import { AttendanceNotificationsController } from "./controllers/attendance/notifications/AttendanceNotificationsController";
import { AttendanceNotificationchannelsController } from "./controllers/attendance/notificationChannels/AttendanceNotificationchannelsController";
import { AttendanceNotificationhistoriesController } from "./controllers/attendance/notificationHistories/AttendanceNotificationhistoriesController";
import { AttendanceStatsDailyController } from "./controllers/attendance/stats/daily/AttendanceStatsDailyController";
import { AttendanceStatsStudentsummariesController } from "./controllers/attendance/stats/studentSummaries/AttendanceStatsStudentsummariesController";
import { AttendanceStatsClassroomsummariesController } from "./controllers/attendance/stats/classroomSummaries/AttendanceStatsClassroomsummariesController";
import { AttendanceStatsAbnormallogsController } from "./controllers/attendance/stats/abnormalLogs/AttendanceStatsAbnormallogsController";
import { AttendanceAccesslogsController } from "./controllers/attendance/accessLogs/AttendanceAccesslogsController";
import { AttendanceAuditlogsController } from "./controllers/attendance/auditLogs/AttendanceAuditlogsController";

@Module({
  controllers: [
    AttendanceTeachersController,
    AttendanceStudentsController,
    AttendanceParentsController,
    AttendanceAdminsController,
    AttendanceSchoolsController,
    AttendanceClassroomsController,
    AttendanceAuthAccountsController,
    AttendanceAuthSocialaccountsController,
    AttendanceAuthSessionsController,
    AttendanceAttendancerecordsController,
    AttendanceAttendancecodesController,
    AttendanceAttendancecodelogsController,
    AttendanceAttendancemethodsController,
    AttendanceNotificationsController,
    AttendanceNotificationchannelsController,
    AttendanceNotificationhistoriesController,
    AttendanceStatsDailyController,
    AttendanceStatsStudentsummariesController,
    AttendanceStatsClassroomsummariesController,
    AttendanceStatsAbnormallogsController,
    AttendanceAccesslogsController,
    AttendanceAuditlogsController,
  ],
})
export class MyModule {}
