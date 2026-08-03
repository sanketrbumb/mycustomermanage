package com.yourowncrm.model;

import jakarta.persistence.*;

@Entity
@Table(name = "states",
       uniqueConstraints = @UniqueConstraint(columnNames = {"country_code","code"}))
public class State {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode = "US";

    @Column(nullable = false, length = 10)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "sort_order")
    private int sortOrder = 999;

    @Column(nullable = false)
    private boolean active = true;

    public State() {}

    public Long    getId()           { return id; }
    public String  getCountryCode()  { return countryCode; }
    public void    setCountryCode(String v) { this.countryCode = v; }
    public String  getCode()         { return code; }
    public void    setCode(String v) { this.code = v; }
    public String  getName()         { return name; }
    public void    setName(String v) { this.name = v; }
    public int     getSortOrder()    { return sortOrder; }
    public void    setSortOrder(int v){ this.sortOrder = v; }
    public boolean isActive()        { return active; }
    public void    setActive(boolean v){ this.active = v; }
}
