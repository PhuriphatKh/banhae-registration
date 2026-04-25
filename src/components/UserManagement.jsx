import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useUserAuth } from "../context/UserAuthContext";
import { useUserProfile } from "../context/ProfileDataContex";
import { Form, Button, Modal, Row, Col, Card } from "react-bootstrap";
import { db } from "../firebase";
import {
  collection,
  updateDoc,
  setDoc,
  getDoc,
  doc,
  onSnapshot,
  arrayUnion,
} from "firebase/firestore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import useClassLevels from "../hooks/useClassLevels";
import useSubjects from "../hooks/useSubjects";
import useRoles from "../hooks/useRoles";

function UserManagement() {
  const [adminID, setAdminID] = useState("");
  const [managerID, setManagerID] = useState("");
  const [studentID, setStudentID] = useState("");
  const [teacherID, setTeacherID] = useState("");
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regRole, setRegRole] = useState("student");
  const [regClassRef, setRegClassRef] = useState("p1");
  const [regtaughtSubject, setRegTaughtSubject] = useState("");
  const { subjects } = useSubjects();

  const [role, setRole] = useState("student");
  const [classRef, setClassRef] = useState("p1");
  const { signUp, logOut } = useUserAuth();
  const { profileData, userDelete } = useUserProfile();

  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  // Modal State for Delete Confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteTargetId(null);
  };

  const [error, setError] = useState("");
  const navigate = useNavigate();

  const { levels, loading } = useClassLevels();
  const { roles, loading: rolesLoading } = useRoles();

  // Configuration for roles and their corresponding Firestore fields
  const ROLE_COUNTER_MAP = {
    student: { setter: setStudentID },
    teacher: { setter: setTeacherID },
    admin: { setter: setAdminID },
    manager: { setter: setManagerID },
  };

  // Generic function to generate IDs
  async function generateID(role) {
    let newID = null;
    const config = ROLE_COUNTER_MAP[role];
    if (!config) return null;

    try {
      // Use the new schema: collection "id_counters", document name is the role
      const counterRef = doc(db, "id_counter", role);
      const counterDoc = await getDoc(counterRef);

      if (counterDoc.exists()) {
        const currentVal = counterDoc.data().count;
        if (typeof currentVal === "number") {
          newID = currentVal + 1;
          // Update the "count" field
          await updateDoc(counterRef, { count: newID });
          config.setter(newID + 1); // Update display for *next* user
        }
      } else {
        console.log(`ไม่พบเอกสาร counter สำหรับ ${role}`);
      }
    } catch (error) {
      console.log("เกิดข้อผิดพลาด:", error);
    }
    return newID;
  }

  // Fetch initial counters for display
  useEffect(() => {
    const fetchCounters = async () => {
      try {
        const roles = Object.keys(ROLE_COUNTER_MAP);
        
        // Fetch each role's counter in parallel or sequential
        for (const role of roles) {
          const counterDoc = await getDoc(doc(db, "id_counter", role));
          if (counterDoc.exists()) {
             const data = counterDoc.data();
             if (typeof data.count === "number") {
               ROLE_COUNTER_MAP[role].setter(data.count + 1);
             }
          }
        }
      } catch (err) {
        console.error("Error fetching counters:", err);
      }
    };
    fetchCounters();
  }, []);

  // ฟังก์ชันสำหรับกรองข้อมูลผู้ใช้ตามตำแหน่งและชั้นเรียน
  const filteredData = (profileData || []).filter((item) => {
    if (role === "teacher") {
      return item.user?.role === "teacher";
    } else if (role === "student") {
      return (
        item.user?.role === "student" &&
        item.user?.class_ref === classRef
      );
    } else if (role === "admin") {
      return item.user?.role === "admin";
    } else if (role === "manager") {
      return item.user?.role === "manager";
    }
  });

  // ฟังก์ชันสำหรับแก้ไขข้อมูลผู้ใช้
  const handelEdit = async (id) => {
    try {
      navigate(`/usermanagement/profile?id=${id}`);
    } catch (err) {
      console.log(err.message);
    }
  };

  // ฟังก์ชันสำหรับลบข้อมูลผู้ใช้
  // ฟังก์ชันสำหรับลบข้อมูลผู้ใช้ (เปิด Modal)
  const handelDelete = (id) => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  // ฟังก์ชันยืนยันการลบ
  const confirmDelete = async () => {
    try {
      if (deleteTargetId) {
        await userDelete(deleteTargetId);
        handleCloseDeleteModal();
      }
    } catch (err) {
      console.log(err.message);
    }
  };

  // ฟังก์ชันสำหรับสมัครสมาชิกผู้ใช้ใหม่
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    let user = null;
    let newID = null;

    const roleConfig = {
      student: { idField: "studentID" },
      teacher: { idField: "teacherID" },
      admin: { idField: "adminID" },
      manager: { idField: "managerID" },
    };

    try {
      const config = roleConfig[regRole];

      if (!config) {
        throw new Error("Invalid role selected");
      }

      newID = await generateID(regRole);

      if (!newID) {
        throw new Error("Failed to generate ID");
      }

      user = await signUp(`${newID}@gmail.com`, `banhae${newID}`);

      if (!user) {
        setError("ไม่สามารถสมัครผู้ใช้ได้ (user is null)");
        return;
      }
      
      handleClose();

      const userProfile = {
        createdAt: new Date(),
        user: {
          firstName: regFirstName,
          lastName: regLastName,
          role: regRole,
          [config.idField]: newID,
        },
      };

      if (regRole === "student") {
        userProfile.user.class_ref = regClassRef;
      }

      await setDoc(doc(db, "profile", user.uid), userProfile);

      if (
        regRole === "teacher" &&
        regtaughtSubject &&
        regtaughtSubject.trim() !== ""
      ) {
        if (regRole === "teacher" && regtaughtSubject) {
          await setDoc(
            doc(db, "subjects", regtaughtSubject),
            {},
            { merge: true }
          );
          await updateDoc(doc(db, "subjects", regtaughtSubject), {
            teachers: arrayUnion(user.uid),
          });
        }
      }

      console.log("User registered and data saved to Firestore!");

      setRegFirstName("");
      setRegLastName("");
      setRegRole("teacher");
      setRegClassRef("p1");
      setRegTaughtSubject("");
    } catch (err) {
      setError(err.message);
      console.log("Error during registration:", err);
    }
  };




  const renderSubjectInfo = (taughtSubject, renderFn) => {
    if (!taughtSubject) return "-";
    if (Array.isArray(taughtSubject)) {
      return taughtSubject.map((id) => {
        const subject = subjects.find((s) => s.id === id);
        return (
          <div
            key={id}
            className="border-bottom border-top border-black w-100 mt-1"
          >
            {subject ? renderFn(subject) : "ไม่พบวิชา"}
          </div>
        );
      });
    }
    const subjectId = taughtSubject?.id || taughtSubject;
    const subject =
      subjects.find((s) => s.id === subjectId) ||
      (typeof taughtSubject === "object" ? taughtSubject : null);
    return subject ? renderFn(subject) : "-";
  };

  const renderRoleSpecificField = () => {
  switch (regRole) {
    case "teacher":
      return (
        <div className="select-wrapper">
          <Form.Select
            value={regtaughtSubject}
            onChange={(e) => setRegTaughtSubject(e.target.value)}
            className="modern-select text-center"
          >
            <option value="" disabled>-- เลือกวิชาที่สอน --</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.id} {subject.name}
              </option>
            ))}
          </Form.Select>
        </div>
      );

    case "student":
      return (
        <div className="select-wrapper">
          <Form.Select
            value={regClassRef}
            onChange={(e) => setRegClassRef(e.target.value)}
            className="modern-select text-center"
          >
            <option value="" disabled>-- เลือกชั้นเรียน --</option>
            {levels.map((level) => (
              <option key={level.id} value={level.code}>
                {level.name_th}
              </option>
            ))}
          </Form.Select>
        </div>
      );

    case "admin":
    case "manager":
      const idText = regRole === "admin" ? adminID : managerID;
      return (
        <div>
          <Form.Control
            type="text"
            value={`รหัสประจำตัว : ${idText}`}
            className="modern-input fw-bold"
            disabled
          />
        </div>
      );

    default:
      return null;
  }
};

  return (
    <div className="shool-record-management-page">
      <Navbar />

      <div className="shool-record-management-detail page-detail p-4">
        <Card
          className="shadow-lg rounded-4 w-100"
          style={{ minHeight: "80vh", height: "auto" }}
        >
          <Card.Body>
            <h3 className="d-flex justify-content-center w-100 my-2 fw-bold">
              จัดการข้อมูลผู้ใช้
            </h3>
            <h3 className="mb-4 fw-bold">ตัวเลือก</h3>

            <Row className="mb-4">
              <Col md={2}>
                <div className="select-wrapper">
                  <Form.Select
                    value={role}
                    className="modern-select text-center"
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name_th}
                      </option>
                    ))}
                  </Form.Select>
                </div>
              </Col>

              {role === "student" && (
                <Col md={2}>
                  <div className="select-wrapper">
                    <Form.Select
                      value={classRef}
                      onChange={(e) => setClassRef(e.target.value)}
                      className="modern-select text-center"
                    >
                      <option value="" disabled>
                        -- เลือกชั้นเรียน --
                      </option>
                      {levels.map((level) => (
                        <option key={level.id} value={level.code}>
                          {level.name_th}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </Col>
              )}

              <Col className="d-flex justify-content-end">
                <Button
                  className="rounded-pill mt-2 edit-butt"
                  onClick={handleShow}
                >
                  เพิ่มข้อมูลผู้ใช้
                </Button>
              </Col>
            </Row>

            <Row className="g-4 mb-4">
              <Col md={12}>
                <div
                  className="table-wrapper border rounded bg-white shadow-sm"
                  style={{ height: "530px", overflow: "hidden" }}
                >
                  <table className="table table-bordered table-hover text-center m-0">
                    <thead
                      className="table-warning"
                      style={{ position: "sticky", top: 0, zIndex: 2 }}
                    >
                      {role === "teacher" ? (
                        <tr>
                          <th style={{ width: "20%" }}>รหัสประจำตัว</th>
                          <th style={{ width: "20%" }}>ชื่อ-สกุล</th>
                          <th style={{ width: "20%" }}>วิชาที่สอน</th>
                          <th style={{ width: "20%" }}>ชั้นเรียนที่สอน</th>
                          <th style={{ width: "20%" }}>ตัวเลือก</th>
                        </tr>
                      ) : (
                        <tr>
                          <th style={{ width: "33.3%" }}>รหัสประจำตัว</th>
                          <th style={{ width: "33.3%" }}>ชื่อ-สกุล</th>
                          <th style={{ width: "33.3%" }}>ตัวเลือก</th>
                        </tr>
                      )}
                    </thead>
                  </table>
                  <div className="table-body-scroll no-scrollbar-container">
                    <div className="scroll-inner">
                      <table className="table table-bordered text-center m-0 table-hover">
                        <tbody>
                          {[...filteredData]
                            .sort((a, b) => {
                              const getID = (user) =>
                                (
                                  user?.teacherID ||
                                  user?.studentID ||
                                  user?.adminID ||
                                  user?.managerID ||
                                  ""
                                ).toString();
                              return getID(a.user).localeCompare(getID(b.user));
                            })
                            .map((item, index) => (
                              <tr key={index}>
                                <td
                                  style={{
                                    width: role === "teacher" ? "20%" : "33.3%",
                                  }}
                                  onClick={() =>
                                    navigate(`/profile?id=${item.id}`)
                                  }
                                >
                                  <div className="d-flex justify-content-center align-items-center w-100 h-100 py-2">
                                    {item.user?.teacherID ||
                                      item.user?.studentID ||
                                      item.user?.adminID ||
                                      item.user?.managerID ||
                                      "-"}
                                  </div>
                                </td>
                                <td
                                  style={{
                                    width: role === "teacher" ? "20%" : "33.3%",
                                  }}
                                  onClick={() =>
                                    navigate(`/profile?id=${item.id}`)
                                  }
                                >
                                  <div className="d-flex justify-content-center align-items-center w-100 h-100 py-2">
                                    {item.user?.firstName}{" "}
                                    {item.user?.lastName}
                                  </div>
                                </td>
                                {role === "teacher" && (
                                  <>
                                    <td
                                      style={{ width: "20%" }}
                                      onClick={() =>
                                        navigate(`/profile?id=${item.id}`)
                                      }
                                    >
                                      <div className="d-flex flex-column justify-content-center align-items-start w-100 h-100 py-2">
                                        {renderSubjectInfo(
                                          item.user?.taughtSubject,
                                          (s) => `${s.id} ${s.name_th || s.name}`
                                        )}
                                      </div>
                                    </td>
                                    <td
                                      style={{ width: "20%" }}
                                      onClick={() =>
                                        navigate(`/profile?id=${item.id}`)
                                      }
                                    >
                                      <div className="d-flex flex-column justify-content-center align-items-center w-100 h-100 py-2">
                                        {renderSubjectInfo(
                                          item.user?.taughtSubject,
                                          (s) => s.classLevel
                                        )}
                                      </div>
                                    </td>
                                  </>
                                )}
                                <td
                                  style={{
                                    width: role === "teacher" ? "20%" : "33.3%",
                                  }}
                                >
                                  <div className="d-flex justify-content-center gap-2 align-items-center w-100 h-100">
                                    <Button
                                      className="edit-butt"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handelEdit(item.id);
                                      }}
                                    >
                                      แก้ไข
                                    </Button>
                                    <Button
                                      className="delete-butt"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handelDelete(item.id);
                                      }}
                                    >
                                      ลบ
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            <Modal size="lg" show={show} onHide={handleClose}>
              <Modal.Header closeButton>
                <Modal.Title className="fw-bold">เพิ่มข้อมูลผู้ใช้</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Row>
                  <Col>
                    <Card className="p-4 shadow-sm">
                      {error && (
                        <div className="alert alert-danger">{error}</div>
                      )}
                      <Form onSubmit={handleSubmit}>
                        <Row className="mb-3">
                          <Col>
                            <div className="select-wrapper">
                              <Form.Select
                                value={regRole}
                                onChange={(e) => setRegRole(e.target.value)}
                                className="modern-select"
                              >
                                {roles.map((role) => (
                                  <option key={role.id} value={role.id}>
                                    {role.name_th}
                                  </option>
                                ))}
                              </Form.Select>
                            </div>
                          </Col>
                          <Col>
                            {renderRoleSpecificField()}
                          </Col>
                        </Row>

                        {["student", "teacher"].includes(regRole) && (
                          <Row className="mb-3">
                            <Col md={6}>
                              <Form.Control
                                type="text"
                                value={
                                  "รหัสประจำตัว : " +
                                  (regRole === "student"
                                    ? studentID
                                    : teacherID)
                                }
                                className="modern-input fw-bold"
                                disabled
                              />
                            </Col>
                          </Row>
                        )}

                        <Row className="mb-3">
                          <Col>
                            <Form.Control
                              type="text"
                              placeholder="ชื่อ"
                              value={regFirstName}
                              onChange={(e) => setRegFirstName(e.target.value)}
                              className="modern-input"
                            />
                          </Col>
                          <Col>
                            <Form.Control
                              type="text"
                              placeholder="สกุล"
                              value={regLastName}
                              onChange={(e) => setRegLastName(e.target.value)}
                              className="modern-input"
                            />
                          </Col>
                        </Row>
                        
                        <Modal.Footer className="d-flex justify-content-center">
                          <Button
                            className="rounded-pill mt-2 edit-butt"
                            type="submit"
                          >
                            เพิ่มข้อมูลผู้ใช้
                          </Button>
                        </Modal.Footer>
                      </Form>
                    </Card>
                  </Col>
                </Row>
              </Modal.Body>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
              <Modal.Header closeButton>
                <Modal.Title className="fw-bold">ยืนยันการลบ</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <div className="text-center p-3">
                  <h5 className="mb-3">คุณต้องการลบข้อมูลผู้ใช้นี้ใช่หรือไม่?</h5>
                  <p className="text-muted">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                </div>
              </Modal.Body>
              <Modal.Footer className="d-flex justify-content-center gap-3">
                <Button variant="secondary" onClick={handleCloseDeleteModal} className="rounded-pill px-4">
                  ยกเลิก
                </Button>
                <Button variant="danger" onClick={confirmDelete} className="rounded-pill px-4">
                  ยืนยัน
                </Button>
              </Modal.Footer>
            </Modal>
          </Card.Body>
        </Card>
      </div>

      <Footer />
    </div>
  );
}

export default UserManagement;
