import getPrismaInstance from "../utils/PrismaClient.js";

export const checkUser = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.json({ message: "Email is required", status: false });
    }
    if (email) {
      const Prisma = getPrismaInstance();
      const user = await Prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.json({ message: "User not found", status: false });
      } else {
        return res.json({ message: "User founded", status: true, data: user });
      }
    }
  } catch (err) {
    next(err);
  }
};

export const onBoardUser = async (req, res, next) => {
  try {
    const { email, name, about, profilePicture } = req.body;
    if (!email || !name || !profilePicture) {
      return res.json({
        message: "Name, Email and Profile picture are required",
        status: false,
      });
    }
    const Prisma = getPrismaInstance();
    const user = await Prisma.user.create({
      data: { email, name, about, profilePicture },
    });

    return res.json({ message: "Succeed", status: true, data: user });
  } catch (error) {
    next(error);
  }
};
