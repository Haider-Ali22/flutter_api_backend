const {
  login,
  register,
  getAllUsers,
  setAvatar,
  logOut,
  addContact,
  getContacts,
  checkContacts,
} = require("../controllers/userController");

const router = require("express").Router();

router.post("/login", login);
router.post("/register", register);
router.get("/allusers/:id", getAllUsers);
router.post("/setavatar/:id", setAvatar);
router.get("/logout/:id", logOut);

// new contact routes
router.post("/addcontact/:id", addContact); // add contact by email or contactNo
router.get("/contacts/:id", getContacts); // get user's contacts
router.post("/check-contacts", checkContacts); // check phone numbers (for mobile import)

module.exports = router;
