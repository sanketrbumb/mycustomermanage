package com.yourowncrm.model;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity @Table(name="customers")
public class Customer extends BaseEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id", nullable=false) private UUID tenantId;
    @Column(name="first_name", nullable=false, length=80) private String firstName;
    @Column(name="last_name", nullable=false, length=80) private String lastName;
    @Column(length=120) private String email;
    @Column(length=20) private String phone;
    private LocalDate dob;
    @Column(length=20) private String gender;
    private String address1;
    private String city;
    @Column(length=2) private String state;
    @Column(length=10) private String zip;
    @Column(name="membership_type", length=60) private String membershipType;
    @Column(name="referral_source", length=100) private String referralSource;
    @Column(name="emergency_contact", length=150) private String emergencyContact;
    @Column(name="emergency_phone", length=20) private String emergencyPhone;
    @Column(columnDefinition="TEXT") private String allergies;
    @Column(name="medical_notes", columnDefinition="TEXT") private String medicalNotes;
    @Column(name="consent_on_file") private boolean consentOnFile = false;
    @Column(nullable=false) private boolean active = true;

    public Customer() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID v) { this.tenantId=v; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String v) { this.firstName=v; }
    public String getLastName() { return lastName; }
    public void setLastName(String v) { this.lastName=v; }
    public String getEmail() { return email; }
    public void setEmail(String v) { this.email=v; }
    public String getPhone() { return phone; }
    public void setPhone(String v) { this.phone=v; }
    public LocalDate getDob() { return dob; }
    public void setDob(LocalDate v) { this.dob=v; }
    public String getGender() { return gender; }
    public void setGender(String v) { this.gender=v; }
    public String getAddress1() { return address1; }
    public void setAddress1(String v) { this.address1=v; }
    public String getCity() { return city; }
    public void setCity(String v) { this.city=v; }
    public String getState() { return state; }
    public void setState(String v) { this.state=v; }
    public String getZip() { return zip; }
    public void setZip(String v) { this.zip=v; }
    public String getMembershipType() { return membershipType; }
    public void setMembershipType(String v) { this.membershipType=v; }
    public String getReferralSource() { return referralSource; }
    public void setReferralSource(String v) { this.referralSource=v; }
    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String v) { this.emergencyContact=v; }
    public String getEmergencyPhone() { return emergencyPhone; }
    public void setEmergencyPhone(String v) { this.emergencyPhone=v; }
    public String getAllergies() { return allergies; }
    public void setAllergies(String v) { this.allergies=v; }
    public String getMedicalNotes() { return medicalNotes; }
    public void setMedicalNotes(String v) { this.medicalNotes=v; }
    public boolean isConsentOnFile() { return consentOnFile; }
    public void setConsentOnFile(boolean v) { this.consentOnFile=v; }
    public boolean isActive() { return active; }
    public void setActive(boolean v) { this.active=v; }

    // ── Audit fields ────────────────────────────────────────────
    @Column(name = "created_by", updatable = false) private Long createdBy;
    @Column(name = "updated_by") private Long updatedBy;
    @Column(name = "deleted_by") private Long deletedBy;
    @Column(name = "deleted_at") private java.time.Instant deletedAt;

    public Long    getCreatedBy()            { return createdBy; }
    public void    setCreatedBy(Long v)      { this.createdBy = v; }
    public Long    getUpdatedBy()            { return updatedBy; }
    public void    setUpdatedBy(Long v)      { this.updatedBy = v; }
    public Long    getDeletedBy()            { return deletedBy; }
    public void    setDeletedBy(Long v)      { this.deletedBy = v; }
    public java.time.Instant getDeletedAt()  { return deletedAt; }
    public void    setDeletedAt(java.time.Instant v) { this.deletedAt = v; }

}