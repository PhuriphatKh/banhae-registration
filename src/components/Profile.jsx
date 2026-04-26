import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { db } from "../firebase";
import { doc, onSnapshot, collection } from "firebase/firestore";
import "./Profile.css";
import Navbar from "./Navbar";
import Footer from "./Footer";
import useRoles from "../hooks/useRoles";
import useClassLevels from "../hooks/useClassLevels";

// ส่วนแสดงข้อมูลสมาชิกในครอบครัว
const FamilyInfoSection = ({
  title,
  profile,
  address,
  phoneKey,
  groupClass,
}) => (
  <>
    <tr className="section-header">
      <th colSpan={2}>{title}</th>
    </tr>
    <tr className={groupClass}>
      <th>ชื่อ-สกุล</th>
      <td>{`${profile?.firstName || "-"} ${profile?.lastName || "-"}`}</td>
    </tr>
    <tr className={groupClass}>
      <th>อาชีพ</th>
      <td>{profile?.occupation || "-"}</td>
    </tr>
    <tr className={groupClass}>
      <th>รายได้/เดือน</th>
      <td>{profile?.monthlyIncome || "-"}</td>
    </tr>
    <tr className={groupClass}>
      <th>บ้านเลขที่</th>
      <td>{address?.houseNum || "-"}</td>
    </tr>
    <tr className={groupClass}>
      <th>หมู่ที่</th>
      <td>{address?.villageNum || "-"}</td>
    </tr>
    <tr className={groupClass}>
      <th>ถนน/ตรอก/ซอย</th>
      <td>{address?.road || "-"}</td>
    </tr>
    <tr className={groupClass}>
      <th>ตำบล/แขวง</th>
      <td>{address?.subDistrictName || "-"}</td>
    </tr>
    <tr className={groupClass}>
      <th>อำเภอ/เขต</th>
      <td>{address?.districtName || "-"}</td>
    </tr>
    <tr className={groupClass}>
      <th>จังหวัด</th>
      <td>{address?.provinceName || "-"}</td>
    </tr>
    <tr className={groupClass}>
      <th>รหัสไปรษณีย์</th>
      <td>{address?.zipcode || "-"}</td>
    </tr>
    <tr className={groupClass}>
      <th>เบอร์โทรศัพท์</th>
      <td>{address?.[phoneKey] || "-"}</td>
    </tr>
  </>
);

function Profile() {
  const [subjects, setSubjects] = useState([]);
  const [profileID, setProfileID] = useState("");
  const [profileData, setProfileData] = useState({ profile: {}, address: {} });
  const location = useLocation();
  const navigate = useNavigate();
  const { roles } = useRoles();
  const { levels: classLevelsData } = useClassLevels();

  // get profile ID from URL query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const id = queryParams.get("id");
    if (id) setProfileID(id);
  }, [location.search]);

  // fetch profile data when profileID changes
  useEffect(() => {
    if (!profileID) return;

    const unsubProfile = onSnapshot(
      doc(db, "profile", profileID),
      (snapshot) => {
        const d = snapshot.data();
        if (!d) return;
        setProfileData((prev) => ({
          ...prev,
          profile: {
            user: {
              studentID: d.user?.studentID || "-",
              teacherID: d.user?.teacherID || "-",
              firstName: d.user?.firstName || "-",
              lastName: d.user?.lastName || "-",
              role: d.user?.role || "-",
              classLevel: d.user?.classLevel || d.user?.class_ref || "-",
              taughtSubject: d.user?.taughtSubject || [],
              birthDate: d.user?.birthDate || "-",
              gender: d.user?.gender || "-",
              ethnicity: d.user?.ethnicity || "-",
              nationality: d.user?.nationality || "-",
              religion: d.user?.religion || "-",
            },
            father: splitFullName(d.father),
            mother: splitFullName(d.mother),
            parent: splitFullName(d.parent),
          },
        }));
      }
    );

    const unsubAddress = onSnapshot(
      doc(db, "address", profileID),
      (snapshot) => {
        const d = snapshot.data();
        if (!d) return;
        setProfileData((prev) => ({
          ...prev,
          address: {
            user: { ...prev.address.user, ...d.user },
            father: { ...prev.address.father, ...d.father },
            mother: { ...prev.address.mother, ...d.mother },
            parent: { ...prev.address.parent, ...d.parent },
          },
        }));
      }
    );

    return () => {
      unsubProfile();
      unsubAddress();
    };
  }, [profileID]);

  // fetch subjects data
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "subjects"), (snapshot) => {
      const newData = [];
      snapshot.forEach((doc) => {
        newData.push({ id: doc.id, ...doc.data() });
      });
      if (newData.length === 0) return;

      setSubjects(newData);
      console.log("Subjects updated:", newData);
    });

    return () => unsubscribe();
  }, []);

  // Helper function to split full name and return structured data
  const splitFullName = (person = {}) => {
    const [firstName = "-", lastName = "-"] = (person.fullName || "- -").split(
      " "
    );
    return {
      firstName,
      lastName,
      occupation: person.occupation || "-",
      monthlyIncome: person.monthlyIncome || "-",
    };
  };

  // user info from profileData
  const userInfo = profileData.profile?.user || {};
  const displayRole = roles?.find((r) => r.id === userInfo.role)?.name_th || userInfo.role;

  const getClassName = (val) => {
    if (!val || val === "-") return "-";
    if (classLevelsData) {
      const found = classLevelsData.find(
        (l) => l.id === val || l.code === val || l.name_th === val
      );
      if (found) return found.name_th;
    }
    return val;
  };

  return (
    <div className="profile-page">
      {/* Top Navbar */}
      <Navbar />

      {/* Profile Detail */}
      <div className="profile-detail">
        <div className="profile-section">
          <div className="profile-title mb-1 justify-content-between align-items-center mb-2">
            <div>ข้อมูลส่วนตัว</div>{" "}
            <button
              className="delete-butt"
              onClick={() =>
                navigate(`/usermanagement/profile?id=${profileID}`)
              }
            >
              แก้ไข
            </button>
          </div>
          <table className="profile-table mb-5">
            <tbody>
              <tr>
                <th>ชื่อ-สกุล</th>
                <td>{`${userInfo.firstName} ${userInfo.lastName}`}</td>
              </tr>
              <tr>
                <th>ตำแหน่ง</th>
                <td>{displayRole}</td>
              </tr>
              <tr>
                {userInfo?.role === "student" ? (
                  <th>ระดับการศึกษา</th>
                ) : userInfo?.role === "teacher" ? (
                  <th>วิชาที่สอน</th>
                ) : null}
                {userInfo.role === "teacher" ? (
                  <td>
                    <div className="d-flex">
                      <div className="d-flex flex-column justify-content-center align-items-start w-50 h-100">
                        {Array.isArray(userInfo?.taughtSubject)
                          ? userInfo.taughtSubject.map((subjectId) => {
                              const subject = subjects.find(
                                (s) => s.id === subjectId
                              );
                              return (
                                <div key={subjectId}>
                                  {subject
                                    ? `${subject.id} ${subject.name}`
                                    : "ไม่พบวิชา"}
                                </div>
                              );
                            })
                          : userInfo?.taughtSubject
                          ? `${userInfo.taughtSubject.id} ${userInfo.taughtSubject.name}`
                          : "-"}
                      </div>
                      <div className="d-flex flex-column justify-content-center align-items-start w-100 h-100">
                        {Array.isArray(userInfo?.taughtSubject)
                          ? userInfo.taughtSubject.map((subjectId) => {
                              const subject = subjects.find(
                                (s) => s.id === subjectId
                              );
                              return (
                                <div key={subjectId}>
                                  {subject
                                    ? getClassName(subject.classLevel)
                                    : "ไม่พบชั้นเรียน"}
                                </div>
                              );
                            })
                          : getClassName(subjects.find(
                              (s) => s.id === userInfo?.taughtSubject
                            )?.classLevel) || "-"}
                      </div>
                    </div>
                  </td>
                ) : userInfo?.role === "student" ? (
                  <td>
                    <div className="d-flex flex-column justify-content-center align-items-start w-100 h-100">
                      {getClassName(userInfo.classLevel)}
                    </div>
                  </td>
                ) : null}
              </tr>
              <tr>
                <th>เกิดวันที่</th>
                <td>
                  {userInfo.birthDate
                    ? new Date(userInfo.birthDate).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "-"}
                </td>
              </tr>
              {userInfo?.role === "student" ? (
                <tr>
                  <th>เพศ</th>
                  <td>{userInfo.gender || "-"}</td>
                </tr>
              ) : null}
              <tr>
                <th>เชื้อชาติ</th>
                <td>{userInfo.ethnicity}</td>
              </tr>
              <tr>
                <th>สัญชาติ</th>
                <td>{userInfo.nationality}</td>
              </tr>
              <tr>
                <th>ศาสนา</th>
                <td>{userInfo.religion}</td>
              </tr>
            </tbody>
          </table>

          <div className="profile-title mb-1">ที่อยู่ปัจจุบัน</div>
          <table className="profile-table mb-5">
            <tbody>
              {[
                ["บ้านเลขที่", profileData.address?.user?.houseNum],
                ["หมู่ที่", profileData.address?.user?.villageNum],
                ["ชื่อหมู่บ้าน", profileData.address?.user?.villageName],
                ["ถนน/ตรอก/ซอย", profileData.address?.user?.road],
                ["ตำบล/แขวง", profileData.address?.user?.subDistrictName],
                ["อำเภอ/เขต", profileData.address?.user?.districtName],
                ["จังหวัด", profileData.address?.user?.provinceName],
                ["รหัสไปรษณีย์", profileData.address?.user?.zipcode],
                ["เบอร์โทรศัพท์", profileData.address?.user?.teleNum],
              ].map(([label, value], i) => (
                <tr key={i}>
                  <th>{label}</th>
                  <td>{value || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {userInfo.role === "student" && (
            <>
              <div className="profile-title mb-1">ข้อมูลครอบครัว</div>
              <table className="profile-table">
                <tbody>
                  <FamilyInfoSection
                    title="บิดา"
                    profile={profileData.profile?.father}
                    address={profileData.address?.father}
                    phoneKey="fatherNum"
                    groupClass="group-father"
                  />
                  <FamilyInfoSection
                    title="มารดา"
                    profile={profileData.profile?.mother}
                    address={profileData.address?.mother}
                    phoneKey="motherNum"
                    groupClass="group-mother"
                  />
                  <FamilyInfoSection
                    title="ผู้ปกครอง"
                    profile={profileData.profile?.parent}
                    address={profileData.address?.parent}
                    phoneKey="parentNum"
                    groupClass="group-parent"
                  />
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Profile;
