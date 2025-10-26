"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TourStatus = exports.BookingStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["CLIENT"] = "CLIENT";
    UserRole["PARTNER"] = "PARTNER";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "PENDING";
    BookingStatus["CONFIRMED"] = "CONFIRMED";
    BookingStatus["CANCELLED"] = "CANCELLED";
    BookingStatus["COMPLETED"] = "COMPLETED";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
var TourStatus;
(function (TourStatus) {
    TourStatus["DRAFT"] = "DRAFT";
    TourStatus["ACTIVE"] = "ACTIVE";
    TourStatus["INACTIVE"] = "INACTIVE";
    TourStatus["COMPLETED"] = "COMPLETED";
})(TourStatus || (exports.TourStatus = TourStatus = {}));
//# sourceMappingURL=index.js.map