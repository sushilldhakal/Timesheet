import Award from "@/lib/db/schemas/award"

export class AwardEvaluationDbQueries {
  static async findAwardById(id: string) {
    return Award.findById(id)
  }
}

