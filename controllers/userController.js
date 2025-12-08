const User = require("../models/userModel");
const bcrypt = require("bcrypt");

// existing login, register, getAllUsers, setAvatar, logOut kept — included below for completeness

module.exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res.json({ msg: "Incorrect Username or Password", status: false });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.json({ msg: "Incorrect Username or Password", status: false });

    // remove password before returning
    const userObj = user.toObject();
    delete userObj.password;
    return res.json({ status: true, user: userObj });
  } catch (ex) {
    next(ex);
  }
};

module.exports.register = async (req, res, next) => {
  try {
    const { username, email, password, contactNo } = req.body;
    const usernameCheck = await User.findOne({ username });
    if (usernameCheck)
      return res.json({ msg: "Username already used", status: false });
    const emailCheck = await User.findOne({ email });
    if (emailCheck)
      return res.json({ msg: "Email already used", status: false });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
      contactNo: contactNo || "",
    });
    const userObj = user.toObject();
    delete userObj.password;
    return res.json({ status: true, user: userObj });
  } catch (ex) {
    next(ex);
  }
};

module.exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.params.id } }).select([
      "email",
      "username",
      "avatarImage",
      "contactNo",
      "_id",
    ]);
    return res.json(users);
  } catch (ex) {
    next(ex);
  }
};

module.exports.setAvatar = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const avatarImage = req.body.image;
    const userData = await User.findByIdAndUpdate(
      userId,
      {
        isAvatarImageSet: true,
        avatarImage,
      },
      { new: true }
    );
    return res.json({
      isSet: userData.isAvatarImageSet,
      image: userData.avatarImage,
    });
  } catch (ex) {
    next(ex);
  }
};

module.exports.logOut = (req, res, next) => {
  try {
    if (!req.params.id) return res.json({ msg: "User id is required " });
    onlineUsers.delete(req.params.id);
    return res.status(200).send();
  } catch (ex) {
    next(ex);
  }
};

/* ---------- New: contact features ---------- */

/**
 * Add a contact to the current user's contacts (by email or contactNo).
 * POST /api/auth/addcontact/:id   body: { email?: string, contactNo?: string }
 */
module.exports.addContact = async (req, res, next) => {
  try {
    const userId = req.params.id; // who is adding the contact
    const { email, contactNo } = req.body;

    if (!email && !contactNo)
      return res
        .status(400)
        .json({ msg: "Provide email or contactNo to add as contact", status: false });

    // find the user to add
    const contactUser = await User.findOne(
      email ? { email } : { contactNo }
    );
    if (!contactUser)
      return res.json({ msg: "User not found", status: false });

    if (contactUser._id.toString() === userId)
      return res.json({ msg: "Cannot add yourself", status: false });

    // add only if not already in contacts
    const me = await User.findById(userId);
    if (!me) return res.status(404).json({ msg: "User not found", status: false });

    const already = me.contacts.find(
      (c) => c.toString() === contactUser._id.toString()
    );
    if (already) return res.json({ msg: "Contact already added", status: true });

    me.contacts.push(contactUser._id);
    await me.save();

    return res.json({ msg: "Contact added", status: true, contact: {
      _id: contactUser._id,
      username: contactUser.username,
      email: contactUser.email,
      contactNo: contactUser.contactNo,
      avatarImage: contactUser.avatarImage
    }});
  } catch (ex) {
    next(ex);
  }
};

/**
 * Get contacts for a user (only returns users they have added)
 * GET /api/auth/contacts/:id
 */
module.exports.getContacts = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const me = await User.findById(userId).populate("contacts", [
      "username",
      "email",
      "avatarImage",
      "contactNo",
      "_id",
    ]);
    if (!me) return res.status(404).json({ msg: "User not found" });
    return res.json(me.contacts);
  } catch (ex) {
    next(ex);
  }
};

/**
 * Check a list of contact numbers (mobile) to see who is registered.
 * POST /api/auth/check-contacts   body: { numbers: ["+923....", ...] }
 * Returns array of { contactNo, userId, username, avatarImage }
 */
module.exports.checkContacts = async (req, res, next) => {
  try {
    const { numbers } = req.body;
    if (!Array.isArray(numbers)) return res.status(400).json({ msg: "numbers must be array" });

    const users = await User.find({ contactNo: { $in: numbers } }).select([
      "contactNo",
      "username",
      "avatarImage",
      "_id",
      "email",
    ]);

    const result = users.map((u) => ({
      contactNo: u.contactNo,
      userId: u._id,
      username: u.username,
      avatarImage: u.avatarImage,
      email: u.email,
    }));
    return res.json(result);
  } catch (ex) {
    next(ex);
  }
};
