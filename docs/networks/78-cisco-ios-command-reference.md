---
title: "Cisco IOS Command Reference"
sidebar_label: "IOS Commands"
sidebar_position: 78
---

# Cisco IOS Command Reference

A comprehensive reference for Cisco IOS CLI commands organized by function. This complements the conceptual pages — use it as a lookup reference during lab and production work.

---

## CLI Navigation

```cisco
! Mode indicators
Router>          ! User EXEC (view-only; no config)
Router#          ! Privileged EXEC (show, debug, copy, write)
Router(config)#  ! Global Configuration
Router(config-if)# ! Interface Configuration
Router(config-router)# ! Routing Protocol

! Entering modes
Router> enable                        ! enter privileged EXEC
Router# configure terminal (conf t)   ! enter global config
Router(config)# interface Gi0/0 (int gi0/0) ! enter interface config
Router(config)# router ospf 1          ! enter routing config
Router(config-if)# exit                ! go back one level
Router(config-if)# end   (Ctrl+Z)     ! back to privileged EXEC

! Help
Router# ?                             ! all commands at current level
Router# show ?                        ! all show sub-commands
Router# show ip ?                     ! sub-options
Router# sho ip ro     (Tab)           ! abbreviate + tab completion

! Search / Filter
Router# show running-config | include ospf       ! lines with "ospf"
Router# show running-config | section router ospf ! ospf config block
Router# show running-config | begin interface    ! from first "interface"
Router# show ip route | exclude 255              ! exclude subnet mask lines

! Output control
Router# terminal length 0             ! disable pagination (all output at once)
Router# terminal length 24            ! re-enable pagination
Router# show interfaces | redirect flash:int_out.txt ! save to file
```

---

## System / Global

```cisco
! Identity
hostname CORE-RTR-01
ip domain-name example.internal
no ip domain-lookup

! Clock
clock timezone EST -5
clock summer-time EDT recurring
ntp server 10.0.0.1 prefer
ntp server 10.0.0.2
service timestamps log datetime msec localtime show-timezone year
service timestamps debug datetime msec localtime show-timezone year

! Login security
enable algorithm-type scrypt secret MyEnablePassword
service password-encryption
username admin privilege 15 algorithm-type scrypt secret MyPassword
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3
crypto key generate rsa modulus 4096

! VTY lines
line vty 0 15
 transport input ssh
 login local
 exec-timeout 10 0
 logging synchronous

! Console
line con 0
 login local
 exec-timeout 10 0
 logging synchronous

! Banners
banner motd ^
WARNING: Unauthorized access prohibited. All activity logged.
^

! Logging
logging host 10.0.0.100
logging trap informational
logging buffered 65536 informational
service sequence-numbers

! Syslog format options
logging origin-id hostname
logging facility local7

! Disable unnecessary services
no service finger
no service udp-small-servers
no service tcp-small-servers
no service pad
no ip http server
no cdp run        (or per-interface: no cdp enable)
```

---

## Interface Configuration

```cisco
! Physical interface
interface GigabitEthernet0/0
 description "To ISP-A — AT&T CID 12345678 | 1Gbps"
 ip address 203.0.113.1 255.255.255.252
 ipv6 address 2001:db8:ff::1/64
 ipv6 enable
 bandwidth 1000000            ! in Kbps — used by OSPF/EIGRP metric
 duplex full
 speed 1000
 no shutdown
 no ip proxy-arp
 no ip redirects
 no ip unreachables

! Shutdown / no shutdown
interface GigabitEthernet0/3
 description "NOT IN USE"
 shutdown

! Loopback (always up; used as router-id, management source)
interface Loopback0
 description "Router ID and Management"
 ip address 10.255.255.1 255.255.255.255
 ipv6 address 2001:db8:0:ffff::1/128

! Subinterface (router-on-a-stick; VLAN routing)
interface GigabitEthernet0/1.10
 encapsulation dot1Q 10
 description "VLAN 10 — Corporate WiFi"
 ip address 10.1.10.1 255.255.255.0
 ip helper-address 10.0.0.50  ! DHCP relay

! SVI (Layer 3 switch VLAN interface)
interface Vlan10
 description "VLAN 10 gateway"
 ip address 10.1.10.1 255.255.255.0
 ip helper-address 10.0.0.50
 no shutdown

! Port-channel (LACP)
interface Port-channel1
 description "LACP to Core-01"
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30,100

interface GigabitEthernet1/0/1
 channel-group 1 mode active

interface GigabitEthernet1/0/2
 channel-group 1 mode active

! Tunnel interface (GRE/IPsec)
interface Tunnel0
 ip address 172.16.0.1 255.255.255.252
 tunnel source GigabitEthernet0/0
 tunnel destination 203.0.113.5
 tunnel mode gre ip
 ip mtu 1400
 ip tcp adjust-mss 1360
 tunnel protection ipsec profile IPSEC-PROFILE
```

---

## Switch-Specific Commands

```cisco
! Access port
interface GigabitEthernet1/0/1
 description "PC — Finance Dept"
 switchport mode access
 switchport access vlan 20
 switchport nonegotiate
 spanning-tree portfast
 spanning-tree bpduguard enable
 no cdp enable

! Trunk port
interface GigabitEthernet1/0/48
 description "Trunk to Distribution"
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 10,20,30,40,100,200
 switchport nonegotiate
 spanning-tree guard root

! Voice VLAN
interface GigabitEthernet1/0/5
 switchport mode access
 switchport access vlan 20
 switchport voice vlan 30
 mls qos trust dscp
 spanning-tree portfast

! Port security
interface GigabitEthernet1/0/2
 switchport port-security maximum 3
 switchport port-security violation restrict
 switchport port-security mac-address sticky
 switchport port-security

! DHCP snooping
ip dhcp snooping
ip dhcp snooping vlan 10,20,30
interface GigabitEthernet1/0/48   ! uplink to DHCP server
 ip dhcp snooping trust

! Dynamic ARP Inspection
ip arp inspection vlan 10,20,30
interface GigabitEthernet1/0/48   ! trusted port
 ip arp inspection trust

! VLAN management
vlan 10
 name CORP-WIFI
vlan 20
 name STAFF-LAN
vlan 30
 name VOIP
vlan 999
 name NATIVE-UNUSED

! Spanning tree
spanning-tree mode rapid-pvst
spanning-tree vlan 10 priority 4096    ! make this the root
spanning-tree vlan 10 root primary     ! alternative — auto-sets priority

! Storm control
interface GigabitEthernet1/0/1
 storm-control broadcast level 20.00
 storm-control multicast level 20.00
 storm-control action shutdown
```

---

## Routing Protocols

### Static Routes

```cisco
ip route 0.0.0.0 0.0.0.0 203.0.113.1           ! default route
ip route 10.1.0.0 255.255.0.0 192.168.1.2      ! via next-hop
ip route 10.1.0.0 255.255.0.0 Tunnel0          ! via interface
ip route 10.1.0.0 255.255.0.0 Gi0/0 192.168.1.2 ! via interface + next-hop (recommended)
ip route 10.1.0.0 255.255.0.0 192.168.1.2 200  ! floating static (AD 200)
ip route 10.1.0.0 255.255.0.0 Null0 254        ! discard route (loop prevention)

ipv6 route ::/0 GigabitEthernet0/0 fe80::1      ! IPv6 default
ipv6 route 2001:db8:1::/64 GigabitEthernet0/0 fe80::1
```

### OSPF

```cisco
router ospf 1
 router-id 10.255.255.1
 auto-cost reference-bandwidth 10000   ! 10G reference
 passive-interface default
 no passive-interface GigabitEthernet0/0
 default-information originate always
 log-adjacency-changes detail

interface GigabitEthernet0/0
 ip ospf 1 area 0
 ip ospf cost 10
 ip ospf priority 100
 ip ospf hello-interval 5
 ip ospf dead-interval 15
 ip ospf authentication message-digest
 ip ospf message-digest-key 1 md5 MyOSPFKey
 ip ospf network point-to-point

! OSPF verification
show ip ospf neighbor
show ip ospf neighbor detail
show ip ospf database
show ip ospf interface GigabitEthernet0/0
show ip ospf border-routers
show ip ospf statistics
```

### EIGRP

```cisco
router eigrp 100
 no auto-summary
 passive-interface default
 no passive-interface GigabitEthernet0/0
 network 10.0.0.0 0.255.255.255
 variance 2                            ! UCMP (unequal-cost load balancing)

interface GigabitEthernet0/0
 bandwidth 1000000
 ip hello-interval eigrp 100 5
 ip hold-time eigrp 100 15
 ip authentication mode eigrp 100 md5
 ip authentication key-chain eigrp 100 EIGRP-KEYS

key chain EIGRP-KEYS
 key 1
  key-string MyEIGRPKey

! EIGRP verification
show ip eigrp neighbors
show ip eigrp topology
show ip eigrp topology all-links
show ip eigrp interfaces
```

### BGP

```cisco
router bgp 65001
 bgp router-id 10.255.255.1
 bgp log-neighbor-changes
 no bgp synchronization

 ! eBGP peer
 neighbor 203.0.113.2 remote-as 65002
 neighbor 203.0.113.2 description "ISP-A"
 neighbor 203.0.113.2 password MyBGPPassword
 neighbor 203.0.113.2 ttl-security hops 1
 neighbor 203.0.113.2 prefix-list ONLY-MY-PREFIXES out
 neighbor 203.0.113.2 prefix-list BGP-IN in
 neighbor 203.0.113.2 maximum-prefix 750000 80   ! warn at 80%, shut at 100%

 ! iBGP peer (via loopback)
 neighbor 10.255.255.2 remote-as 65001
 neighbor 10.255.255.2 update-source Loopback0
 neighbor 10.255.255.2 next-hop-self

 ! Advertise own prefixes
 network 203.0.113.0 mask 255.255.255.0

! BGP verification
show ip bgp summary
show ip bgp
show ip bgp 203.0.113.0/24
show ip bgp neighbors 203.0.113.2
show ip bgp neighbors 203.0.113.2 routes
show ip bgp neighbors 203.0.113.2 advertised-routes
show ip bgp community 65001:100
```

---

## HSRP / VRRP

```cisco
! HSRP
interface GigabitEthernet0/0
 standby version 2
 standby 1 ip 10.1.10.1               ! virtual IP
 standby 1 priority 110                ! higher = preferred active
 standby 1 preempt delay minimum 30   ! preempt after 30s
 standby 1 timers msec 200 msec 750   ! aggressive timers
 standby 1 authentication md5 key-string HSRPSecret
 standby 1 track GigabitEthernet0/1 20  ! decrement priority if Gi0/1 fails

show standby
show standby brief

! VRRP
interface GigabitEthernet0/0
 vrrp 1 ip 10.1.10.1
 vrrp 1 priority 110
 vrrp 1 preempt
 vrrp 1 timers advertise msec 200

show vrrp
show vrrp brief
```

---

## Access Control Lists

```cisco
! Named extended ACL
ip access-list extended OUTSIDE-IN
 remark === PERMIT ESTABLISHED SESSIONS ===
 permit tcp any any established
 remark === PERMIT INBOUND SERVICES ===
 permit tcp any host 203.0.113.10 eq 80
 permit tcp any host 203.0.113.10 eq 443
 permit icmp any any echo-reply
 permit icmp any any unreachable
 remark === DENY AND LOG ALL ELSE ===
 deny ip any any log

interface GigabitEthernet0/0
 ip access-group OUTSIDE-IN in

! Show ACL with hit counts
show access-lists OUTSIDE-IN
clear ip access-list counters OUTSIDE-IN

! Standard ACL on VTY
ip access-list standard MGMT-ONLY
 permit 10.0.0.0 0.0.0.255
 deny any log

line vty 0 15
 access-class MGMT-ONLY in
```

---

## NAT / PAT

```cisco
! PAT (many-to-one / overload)
ip nat inside source list NAT-INSIDE interface GigabitEthernet0/0 overload
ip access-list standard NAT-INSIDE
 permit 10.0.0.0 0.255.255.255

interface GigabitEthernet0/0      ! WAN
 ip nat outside
interface GigabitEthernet0/1      ! LAN
 ip nat inside

! Static NAT (one-to-one)
ip nat inside source static 10.0.1.10 203.0.113.10

! Static PAT (port forwarding)
ip nat inside source static tcp 10.0.1.10 80 203.0.113.10 80
ip nat inside source static tcp 10.0.1.10 443 203.0.113.10 443

show ip nat translations
show ip nat statistics
clear ip nat translation *         ! clear NAT table (caution in production)
debug ip nat                       ! verbose NAT debugging
```

---

## QoS / MQC

```cisco
! Class maps
class-map match-any VOICE-RTP
 match ip dscp ef

class-map match-any VIDEO
 match ip dscp af41

class-map match-any CRITICAL-DATA
 match ip dscp af31

! Policy map (LLQ)
policy-map WAN-QOS
 class VOICE-RTP
  priority percent 20              ! 20% strict priority
 class VIDEO
  bandwidth percent 25
 class CRITICAL-DATA
  bandwidth percent 20
 class class-default
  fair-queue

! Apply to interface
interface GigabitEthernet0/0
 service-policy output WAN-QOS

show policy-map interface GigabitEthernet0/0
show class-map
```

---

## Debugging (Use with Caution!)

```cisco
! Always check CPU before debugging
show processes cpu sorted          ! confirm CPU not already high

! Enable debugging
debug ip ospf adj                  ! OSPF adjacency
debug ip ospf hello                ! OSPF hellos
debug ip eigrp events              ! EIGRP events
debug ip bgp updates               ! BGP update processing
debug ip routing                   ! route table changes
debug ip icmp                      ! ICMP traffic
debug ip nat                       ! NAT translation
debug ip packet detail             ! packet forwarding (VERY HIGH IMPACT — don't do on production)
debug aaa authentication           ! AAA auth
debug tacacs events                ! TACACS+ events
debug radius events                ! RADIUS events

! ALWAYS turn off debugging when done
undebug all                        ! turn off all debugging
no debug all                       ! same
terminal monitor                   ! see debug output in SSH session (needed)
terminal no monitor                ! stop debug output in SSH session

! Limit debug impact
debug ip ospf adj 10.0.0.1        ! debug only for specific neighbor
access-list 100 permit ip host 10.0.0.1 any
debug ip packet 100 detail         ! debug with ACL filter (safer for packet debug)
```

---

## Useful Verification Sequences

```cisco
! Quick health check
show version | include uptime|Version
show processes cpu | include CPU
show processes memory | include Total
show interfaces | include errors|CRC|reset|down
show log | tail 30

! BGP health check
show bgp summary
show bgp ipv4 unicast summary
show ip bgp rib-failure

! OSPF health check  
show ip ospf neighbor
show ip ospf database summary
show ip route ospf | include ^O

! Interface utilization
show interfaces GigabitEthernet0/0 | include rate|BW|packets

! Spanning tree (check for port state and TCN)
show spanning-tree summary
show spanning-tree detail | include changes|Blocked|Forwarding

! Security
show access-lists
show ip nat translations
show crypto session
show crypto ipsec sa
```

---

## Configuration Save / Restore

```cisco
! Save running config
copy running-config startup-config  (write memory / wr)

! Show and compare configs
show running-config
show startup-config
show running-config | diff startup-config   ! (IOS XE 16.x+)

! Backup to TFTP
copy running-config tftp:
! Address: 10.0.0.100, filename: rtr01-backup-2025-01-01.cfg

! Restore from TFTP
copy tftp: running-config
! Merges — does not delete existing config

! Replace config (atomic — replaces entire config)
configure replace tftp://10.0.0.100/rtr01-backup.cfg
configure replace flash:backup.cfg

! Archive (automatic versioned config backups)
archive
 path tftp://10.0.0.100/$h-$t  ! hostname + timestamp
 write-memory
 time-period 1440               ! archive every 24 hours
```

---

## Tips

- Use `terminal length 0` before any show command you want to capture — pagination breaks automated scripts and copy-paste.
- Filter show output with `| include`, `| exclude`, `| section`, `| begin` — these dramatically reduce the time to find relevant information.
- `show interfaces | include rate` gives you a quick one-line summary of input/output rates for all interfaces — useful for spotting a saturated link.
- Always `undebug all` when done debugging — leaving debug on consumes CPU and floods the console/log buffer.
- `configure replace` (IOS XE) atomically replaces the entire config — far safer than manually applying individual commands for config rollback.

---

## Summary

This page is a command lookup reference. The conceptual explanations of why each command exists and how it works are in the dedicated topic pages. Key habits:
- Use `| include` and `| section` to filter — reading 500 lines of running config is unnecessary.
- Check CPU (`show processes cpu`) before enabling any debug — debugging on a stressed device can make it unresponsive.
- Save config immediately after confirming a change works — losing config on unexpected reload happens more often than expected.
- Use structured verification sequences — a consistent "health check" sequence catches most common issues quickly.
