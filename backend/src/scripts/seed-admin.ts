import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { UserSchema } from '../modules/users/schemas/user.schema';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/status.enum';

// Load environment variables
dotenv.config();

// Create User model using the existing schema
const UserModel = mongoose.model('User', UserSchema);

async function seedAdmin() {
  try {
    // MongoDB connection
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/team-management';

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Admin user details
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

    // Check if admin user already exists by email
    const existingAdmin = await UserModel.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(
        `Admin user with email ${adminEmail} already exists. Skipping creation.`,
      );
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Create admin user
    const adminUser = new UserModel({
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      joinDate: new Date(),
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('Please change the default password after first login.');
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection && mongoose.connection.readyState) {
      await mongoose.connection.close();
      console.log('Database connection closed');
    }
  }
}

// Run the seed function
if (require.main === module) {
  seedAdmin();
}

export { seedAdmin };
