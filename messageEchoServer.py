#!/usr/bin/env python
# -*- coding: utf-8 -*-

#
#  Copyright (c) 2016-2020 Moddable Tech, Inc.
# 
#    This file is part of the Moddable SDK.
# 
#    This work is licensed under the
#        Creative Commons Attribution 4.0 International License.
#    To view a copy of this license, visit
#        <http://creativecommons.org/licenses/by/4.0>.
#    or send a letter to Creative Commons, PO Box 1866,
#    Mountain View, CA 94042, USA.
# 
#
#  This is part of the UDP socket example. It receives messages from
#  the Moddable device, prints the contents if possible and then
#  echos the unchanged message back to the Moddable.

import socket
import struct

server_address = '0.0.0.0' # Local IP
server_port    = 30279   # Port to receive on
server = (server_address, server_port)

# Create socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Bind to server
sock.bind(server)

print("Listening on " + server_address + ":" + str(server_port))

while True:

    # Receive a message from the Moddable device
    msg, client_address = sock.recvfrom(1024)

    # Print how much we got and from who
    print("")
    print("Receiving %d bytes from %s" % (len(msg), str(client_address)))

    # Insure we have at least a header
    if len(msg) < 8:
        print("Too few bytes for header")
        continue
    #

    # Split message into header and body
    header = msg[0:8]
    body   = msg[8:]

    # Decode the header
    (msgId, version, flags, source, spare) = struct.unpack("HBBHH", header)

    # Print the header
    print("  Header: MsgId:%x Version:%x Flags:%x Source:%x, Spare:%x" %(msgId,version,flags,source,spare))

    # ###############################################
    # Process message based on message type in header
    # ###############################################

    # Environment Message
    if msgId == 0x1234:

        # Make sure the size is right
        if len(body) != 14:
            print("  Invalid size (%d) of message %d" % (len(msg), msgId))
        else:    
            # Decode the body
            (temperature, 
             pressure, 
             humidity, 
             radiationLevel) = struct.unpack("fffH", body)
             
            print("  ENV: Temp:%f Pres:%f Hum:%f Rad:%d" % \
                  (temperature, pressure,humidity,radiationLevel))

    # Some other message type
    elif msgId == 0x001:
        print("  Message Type 1")

    # Other messages go here    
    # ....

    # Unknown message type
    else:
        print("Unknown message of type %d" % msgId)
    #
        
    # Echo the message back to Moddable
    sent = sock.sendto(msg, client_address)
#

