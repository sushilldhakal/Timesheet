import { User } from "@/lib/db"

export class SetupAdminDbQueries {
  static async findByUsername(usernameLower: string) {
    return User.findOne({ username: usernameLower })
  }

  static async createAdmin(args: {
    usernameLower: string
    password: string
    createdAt: number
    updatedAt: number
  }) {
    return User.create({
      name: "Administrator",
      username: args.usernameLower,
      password: args.password,
      role: "admin",
      location: [],
      rights: [],
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    })
  }

  static async countAdmins() {
    return User.countDocuments({ role: "admin" })
  }
}

